import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { projectAiEnabled, projectIntegrationEnabled } from "./configuration";
import { embedTexts, generateProjectNarrative } from "./ai";
import { getBranchSha, getProjectSources, getRepository } from "./github";
import { assetsSchema, EMBEDDING_MODEL, milestonesSchema } from "./schemas";

const LEASE_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;

export async function serializable<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await getPrisma().$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20_000 }); }
    catch (error) {
      if (attempt === 2 || !["P2034", "P2002"].includes((error as { code?: string }).code ?? "")) throw error;
    }
  }
  throw new Error("Transaction retry exhausted");
}

export async function enqueueProjectSync(projectId: string, deliveryId: string, requestedSha: string | null) {
  if (!projectIntegrationEnabled()) throw new Error("Integration disabled");
  return serializable(async (tx) => {
    const existing = await tx.projectSyncJob.findUnique({ where: { deliveryId }, select: { id: true } });
    if (existing) return { ...existing, duplicate: true };
    const config = await tx.projectIntegration.findUnique({ where: { projectId } });
    if (!config?.enabled) throw new Error("Project integration disabled");
    const active = await tx.projectSyncJob.count({ where: { projectId, status: { in: ["QUEUED", "PROCESSING"] } } });
    if (active >= 20) throw new Error("Project queue full");
    const job = await tx.projectSyncJob.create({ data: {
      projectId, deliveryId, requestedSha, configurationUpdatedAt: config.updatedAt,
    }, select: { id: true } });
    return { ...job, duplicate: false };
  });
}

async function claimJob(projectId?: string) {
  const now = new Date();
  // Reclaim crashed workers. Their old lease token cannot commit after takeover.
  await getPrisma().projectSyncJob.updateMany({
    where: { status: "PROCESSING", leaseUntil: { lt: now }, attempts: { gte: MAX_ATTEMPTS } },
    data: { status: "FAILED", error: "RETRIES_EXHAUSTED", finishedAt: now, leaseToken: null, leaseUntil: null },
  });
  for (let attempt = 0; attempt < 3; attempt++) {
  const job = await getPrisma().projectSyncJob.findFirst({
    where: { projectId, attempts: { lt: MAX_ATTEMPTS }, OR: [
      { status: "QUEUED", availableAt: { lte: now } },
      { status: "PROCESSING", leaseUntil: { lt: now } },
    ] }, orderBy: { createdAt: "asc" },
  });
  if (!job) return null;
  const leaseToken = randomUUID();
  const result = await getPrisma().projectSyncJob.updateMany({
    where: { id: job.id, status: job.status, attempts: job.attempts, leaseToken: job.leaseToken },
    data: { status: "PROCESSING", leaseToken, leaseUntil: new Date(now.getTime() + LEASE_MS), attempts: { increment: 1 }, error: null },
  });
  if (result.count) return { ...job, attempts: job.attempts + 1, leaseToken };
  }
  return null;
}

export async function processProjectSync(projectId?: string) {
  if (!projectAiEnabled()) return { status: "disabled" };
  const job = await claimJob(projectId);
  if (!job) return { status: "idle" };
  let failure = "SOURCE_UNAVAILABLE";
  try {
    const config = await getPrisma().projectIntegration.findUnique({ where: { projectId: job.projectId }, include: { project: true } });
    if (!config?.enabled || config.updatedAt.getTime() !== job.configurationUpdatedAt.getTime()) {
      await finishSuperseded(job.id, job.leaseToken);
      return { status: "superseded" };
    }
    const repository = await getRepository(config.repositoryId);
    const sha = await getBranchSha(repository, config.branch);
    // Out-of-order webhook deliveries never replace a newer branch snapshot.
    if (job.requestedSha && job.requestedSha !== sha) {
      await finishSuperseded(job.id, job.leaseToken);
      return { status: "superseded" };
    }
    const chunks = await getProjectSources(repository, sha, config.sourcePaths);
    const cached = await getPrisma().$queryRaw<Array<{ path: string; ordinal: number; sourceHash: string; embedding: string }>>(Prisma.sql`
      SELECT c.path, c.ordinal, c."sourceHash", c.embedding::text AS embedding
      FROM "ProjectKnowledgeChunk" c JOIN "ProjectKnowledge" k ON k.id = c."knowledgeId"
      WHERE k."projectId" = ${job.projectId}::uuid AND k."embeddingModel" = ${EMBEDDING_MODEL}
    `);
    const cache = new Map(cached.map((c) => [`${c.path}:${c.ordinal}:${c.sourceHash}`, c.embedding]));
    const vectors = chunks.map((c) => cache.get(`${c.path}:${c.ordinal}:${c.sourceHash}`));
    const missing = chunks.map((c, i) => ({ c, i })).filter(({ i }) => !vectors[i]);
    failure = "AI_UNAVAILABLE";
    if (missing.length) {
      const embedded = await embedTexts(missing.map(({ c }) => c.content), "RETRIEVAL_DOCUMENT");
      missing.forEach(({ i }, index) => { vectors[i] = embedded[index]; });
    }
    const generated = await generateProjectNarrative(chunks, {
      assets: assetsSchema.parse(config.assets), milestones: milestonesSchema.parse(config.milestones),
    });
    // Check branch again after external calls, before saving the pending draft.
    failure = "SOURCE_UNAVAILABLE";
    if (await getBranchSha(repository, config.branch) !== sha) {
      await finishSuperseded(job.id, job.leaseToken);
      return { status: "superseded" };
    }
    failure = "PERSISTENCE_FAILED";
    const saved = await serializable(async (tx) => {
      const current = await tx.projectIntegration.findUnique({ where: { projectId: job.projectId }, include: { project: true } });
      if (!current?.enabled || current.updatedAt.getTime() !== config.updatedAt.getTime() || current.project.updatedAt.getTime() !== config.project.updatedAt.getTime()) return false;
      const owned = await tx.projectSyncJob.updateMany({
        where: { id: job.id, leaseToken: job.leaseToken, status: "PROCESSING", leaseUntil: { gt: new Date() } },
        data: { status: "SUCCEEDED", finishedAt: new Date(), leaseUntil: null, leaseToken: null },
      });
      if (!owned.count) return false;
      await tx.projectKnowledge.deleteMany({ where: { projectId: job.projectId, status: "DRAFT" } });
      const knowledge = await tx.projectKnowledge.create({ data: {
        projectId: job.projectId, commitSha: sha, repositoryFullName: repository.full_name,
        configurationUpdatedAt: config.updatedAt, projectUpdatedAt: config.project.updatedAt,
        narrative: generated.content, generationModel: generated.model, embeddingModel: EMBEDDING_MODEL,
      } });
      for (const [index, chunk] of chunks.entries()) {
        await tx.$executeRaw(Prisma.sql`INSERT INTO "ProjectKnowledgeChunk"
          (id, "knowledgeId", path, ordinal, content, "sourceHash", "sourceUrl", embedding)
          VALUES (${randomUUID()}::uuid, ${knowledge.id}::uuid, ${chunk.path}, ${chunk.ordinal},
          ${chunk.content}, ${chunk.sourceHash}, ${chunk.sourceUrl}, ${vectors[index]!}::extensions.vector)`);
      }
      // Sync metadata is distinct from editorial updatedAt and progress.
      await tx.$executeRaw(Prisma.sql`UPDATE "Project" SET "lastTelemetryAt" = now() WHERE id = ${job.projectId}::uuid`);
      return true;
    });
    if (!saved) await finishSuperseded(job.id, job.leaseToken);
    return { status: saved ? "succeeded" : "superseded" };
  } catch {
    const exhausted = job.attempts >= MAX_ATTEMPTS;
    await getPrisma().projectSyncJob.updateMany({
      where: { id: job.id, leaseToken: job.leaseToken, status: "PROCESSING" },
      data: { status: exhausted ? "FAILED" : "QUEUED", error: failure,
        availableAt: new Date(Date.now() + 60_000 * 2 ** job.attempts),
        finishedAt: exhausted ? new Date() : null, leaseToken: null, leaseUntil: null },
    });
    return { status: exhausted ? "failed" : "retrying" };
  }
}

async function finishSuperseded(id: string, leaseToken: string) {
  await getPrisma().projectSyncJob.updateMany({
    where: { id, leaseToken, status: "PROCESSING" },
    data: { status: "SUPERSEDED", finishedAt: new Date(), leaseToken: null, leaseUntil: null },
  });
}
