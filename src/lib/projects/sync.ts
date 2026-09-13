import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { projectAiEnabled, projectIntegrationEnabled } from "./configuration";
import { embedTexts, generateProjectNarrative } from "./ai";
import { getBranchSha, getRepository } from "./github";
import { discoverProject } from "./discovery";
import { analyzeRepositoryImages } from "./media";
import { EMBEDDING_MODEL, milestoneProgress, narrativeText, projectSnapshotSchema, MAX_CHUNKS } from "./schemas";

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

export async function reconcileProjectQueue() {
  if (!projectAiEnabled()) return { status: "disabled", processed: 0 };
  const integrations = await getPrisma().projectIntegration.findMany({ where: { enabled: true }, select: { projectId: true }, take: 20,
    orderBy: [{ project: { lastTelemetryAt: { sort: "asc", nulls: "first" } } }, { projectId: "asc" }],
  });
  for (const config of integrations) {
    const pending = await getPrisma().projectSyncJob.count({ where: { projectId: config.projectId, status: { in: ["QUEUED", "PROCESSING"] } } });
    if (!pending) await enqueueProjectSync(config.projectId, `reconcile:${config.projectId}:${Math.floor(Date.now() / 86400_000)}`, null);
  }
  const deadline = Date.now() + 180_000;
  let processed = 0;
  while (processed < 3 && Date.now() < deadline) {
    const result = await processProjectSync();
    if (result.status === "idle" || result.status === "disabled") break;
    processed++;
  }
  return { status: "processed", processed };
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
    const sha = await getBranchSha(repository, repository.default_branch);
    // Out-of-order webhook deliveries never replace a newer branch snapshot.
    if (job.requestedSha && job.requestedSha !== sha) {
      await finishSuperseded(job.id, job.leaseToken);
      return { status: "superseded" };
    }
    const discovered = await discoverProject(repository, sha);
    const previous = await getPrisma().projectKnowledge.findFirst({ where: { projectId: job.projectId, status: "PUBLISHED" }, select: { narrative: true } });
    const cachedSnapshot = projectSnapshotSchema.safeParse(previous?.narrative);
    failure = "IMAGE_ANALYSIS_FAILED";
    const assets = await analyzeRepositoryImages(repository, sha, discovered.images, cachedSnapshot.success ? cachedSnapshot.data.assets : []);
    const chunks = [...discovered.chunks, ...assets.map((asset) => {
      const content = `Visual observation, not proof of implementation.\nES: ${asset.caption.es}\nEN: ${asset.caption.en}`;
      return { path: asset.sourcePath, ordinal: 0, content, sourceHash: createHash("sha256").update(`${asset.blobSha}:${content}`).digest("hex"), sourceUrl: `https://github.com/${repository.full_name}/blob/${sha}/${asset.sourcePath.split("/").map(encodeURIComponent).join("/")}` };
    })];
    if (chunks.length > MAX_CHUNKS) throw new Error("Corpus exceeds chunk budget");
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
      assets, milestones: discovered.milestones, repositoryName: repository.name || repository.full_name.split("/")[1],
    });
    const titles = new Map(generated.content.milestoneTitles.map((item) => [item.id, item.title]));
    if (titles.size !== discovered.milestones.length || discovered.milestones.some((item) => !titles.has(item.id))) throw new Error("Milestone identities changed during generation");
    const snapshot = projectSnapshotSchema.parse({
      ...generated.content.narrative, automatic: true, names: generated.content.names, assets,
      milestones: discovered.milestones.map((item) => ({ ...item, title: titles.get(item.id)! })), metadata: discovered.metadata,
    });
    // Check branch again after external calls, before saving the pending draft.
    failure = "SOURCE_UNAVAILABLE";
    if (await getBranchSha(await getRepository(config.repositoryId), repository.default_branch) !== sha) {
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
      // Publish the entire generated snapshot in one transaction, never a manual draft.
      await tx.projectKnowledge.deleteMany({ where: { projectId: job.projectId } });
      const knowledge = await tx.projectKnowledge.create({ data: {
        status: "PUBLISHED", publishedAt: new Date(),
        projectId: job.projectId, commitSha: sha, repositoryFullName: repository.full_name,
        configurationUpdatedAt: config.updatedAt, projectUpdatedAt: config.project.updatedAt,
        narrative: snapshot, generationModel: generated.model, embeddingModel: EMBEDDING_MODEL,
      } });
      for (const [index, chunk] of chunks.entries()) {
        await tx.$executeRaw(Prisma.sql`INSERT INTO "ProjectKnowledgeChunk"
          (id, "knowledgeId", path, ordinal, content, "sourceHash", "sourceUrl", embedding)
          VALUES (${randomUUID()}::uuid, ${knowledge.id}::uuid, ${chunk.path}, ${chunk.ordinal},
          ${chunk.content}, ${chunk.sourceHash}, ${chunk.sourceUrl}, ${vectors[index]!}::extensions.vector)`);
      }
      for (const locale of ["ES", "EN"] as const) {
        const key = locale === "ES" ? "es" : "en";
        await tx.projectTranslation.upsert({ where: { projectId_locale: { projectId: job.projectId, locale } },
          create: { projectId: job.projectId, locale, name: snapshot.names[key], summary: snapshot[key].summary, detailedInfo: narrativeText(snapshot, key) },
          update: { name: snapshot.names[key], summary: snapshot[key].summary, detailedInfo: narrativeText(snapshot, key) },
        });
      }
      await tx.project.update({ where: { id: job.projectId }, data: {
        repositoryFullName: repository.full_name, repositoryUrl: `https://github.com/${repository.full_name}`,
        demoUrl: snapshot.metadata.demoUrl, techStack: snapshot.metadata.techStack, status: snapshot.metadata.status,
        progressPct: milestoneProgress(snapshot.milestones) ?? 0, lastTelemetryAt: new Date(), showOnPortfolio: true,
      } });
      return true;
    });
    if (!saved) await finishSuperseded(job.id, job.leaseToken);
    else {
      try { revalidateTag("portfolio", { expire: 0 }); } catch { /* The committed snapshot remains valid; the cache also has a finite TTL. */ }
    }
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
