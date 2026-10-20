import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { projectAiEnabled, projectIntegrationEnabled } from "./configuration";
import { digestModel, digestSources, DIGEST_POLICY, embedTexts, generateProjectNarrative, projectAiFailureCode } from "./ai";
import { getBranchSha, type RepositorySource } from "./github";
import { openRepository } from "./source";
import { GithubAppError } from "./github-app";
import { discoverProject } from "./discovery";
import { analyzeRepositoryImages } from "./media";
import { resolveMilestones } from "./milestones";
import { EMBEDDING_MODEL, milestoneProgress, narrativeText, projectSnapshotSchema, MAX_CHUNKS, MAX_SOURCE_BYTES } from "./schemas";
import { disclosurePolicies, governanceEnabled } from "@/data/project-disclosure";
import { getDocumentGenerationModel } from "@/lib/documents/gemini";
import { contributionSources } from "./contributions";
import { canPublishPrivateRepository, defaultDisclosure, disclosureSchema } from "./disclosure";

const LEASE_MS = 10 * 60_000;
// Bump when the prompt or output contract changes so every project regenerates once.
const GENERATION_POLICY = "narrative-v2";

// Depends only on content hashes, never on the commit, so a push that leaves the
// sampled sources unchanged (or a daily reconcile) reuses the published snapshot.
export function corpusFingerprint(chunks: Array<{ path: string; ordinal: number; sourceHash: string }>, model: string) {
  const parts = chunks.map((chunk) => `${chunk.path}\u0000${chunk.ordinal}\u0000${chunk.sourceHash}`).sort();
  return createHash("sha256").update(JSON.stringify([GENERATION_POLICY, DIGEST_POLICY, model, digestModel(), EMBEDDING_MODEL, parts])).digest("hex");
}
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
  let repositoryUnavailable = false;
  let allowPrivate = false;
  const loadRepository = async (id: string, hint: string | null): Promise<RepositorySource> => {
    let source;
    try { source = await openRepository(id, hint); }
    catch (error) {
      repositoryUnavailable = error instanceof Error && (error.message === "Project sources must be public" || error.message === "GitHub HTTP 404" || (error instanceof GithubAppError && error.status === 404));
      throw error;
    }
    if (source.repository.private && !allowPrivate) { repositoryUnavailable = true; throw new Error("Private repository without publication consent"); }
    return source;
  };
  try {
    const config = await getPrisma().projectIntegration.findUnique({ where: { projectId: job.projectId }, include: { project: true } });
    const disclosure = (await disclosurePolicies()).find((row) => row.projectId === job.projectId);
    if (disclosure && (disclosure.policy.mode !== "FULL" || disclosure.policy.externalAi === "NONE")) {
      await finishSuperseded(job.id, job.leaseToken);
      return { status: "superseded" };
    }
    if (!config?.enabled || config.updatedAt.getTime() !== job.configurationUpdatedAt.getTime()) {
      await finishSuperseded(job.id, job.leaseToken);
      return { status: "superseded" };
    }
    allowPrivate = canPublishPrivateRepository(disclosure?.policy);
    const source = await loadRepository(config.repositoryId, config.project.repositoryFullName);
    const { repository } = source;
    const sha = await getBranchSha(source, repository.default_branch);
    // Out-of-order webhook deliveries never replace a newer branch snapshot.
    if (job.requestedSha && job.requestedSha !== sha) {
      await finishSuperseded(job.id, job.leaseToken);
      return { status: "superseded" };
    }
    const discovered = await discoverProject(source, sha);
    const previous = await getPrisma().projectKnowledge.findFirst({ where: { projectId: job.projectId, status: "PUBLISHED" }, select: { narrative: true } });
    const cachedSnapshot = projectSnapshotSchema.safeParse(previous?.narrative);
    const previousMilestones = cachedSnapshot.success && cachedSnapshot.data.metadata.repositoryId === String(repository.id) ? cachedSnapshot.data.milestones : [];
    failure = "IMAGE_ANALYSIS_FAILED";
    // Private images would need raw GitHub URLs that only an installation token can read.
    const assets = repository.private ? [] : await analyzeRepositoryImages(source, sha, discovered.images, cachedSnapshot.success ? cachedSnapshot.data.assets : []);
    const contributions = await contributionSources(source, disclosure?.policy.participation.githubIds ?? []);
    const chunks = [...discovered.chunks, ...contributions, ...assets.map((asset) => {
      const content = `Visual observation, not proof of implementation.\nES: ${asset.caption.es}\nEN: ${asset.caption.en}`;
      return { path: asset.sourcePath, ordinal: 0, content, sourceHash: createHash("sha256").update(`${asset.blobSha}:${content}`).digest("hex"), sourceUrl: `https://github.com/${repository.full_name}/blob/${sha}/${asset.sourcePath.split("/").map(encodeURIComponent).join("/")}` };
    })];
    if (chunks.length > MAX_CHUNKS || chunks.reduce((size, chunk) => size + Buffer.byteLength(chunk.content), 0) > MAX_SOURCE_BYTES) throw new Error("Corpus exceeds source budget");
    const corpusHash = corpusFingerprint(chunks, getDocumentGenerationModel());
    if (cachedSnapshot.success && cachedSnapshot.data.metadata.corpusHash === corpusHash && cachedSnapshot.data.metadata.repositoryId === String(repository.id)) {
      failure = "PERSISTENCE_FAILED";
      const owned = await getPrisma().projectSyncJob.updateMany({
        where: { id: job.id, leaseToken: job.leaseToken, status: "PROCESSING", leaseUntil: { gt: new Date() } },
        data: { status: "UNCHANGED", finishedAt: new Date(), leaseUntil: null, leaseToken: null },
      });
      if (owned.count) await getPrisma().project.updateMany({ where: { id: job.projectId }, data: { lastTelemetryAt: new Date() } });
      return { status: owned.count ? "unchanged" : "superseded" };
    }
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
    const digests = await digestSources(chunks, cachedSnapshot.success ? cachedSnapshot.data.digests : []);
    const generated = await generateProjectNarrative(chunks, {
      assets, previousMilestones, repositoryName: repository.name || repository.full_name.split("/")[1],
      digests, technologies: discovered.metadata.techStack,
    });
    const milestones = resolveMilestones(generated.content.milestones, chunks, previousMilestones);
    const snapshot = projectSnapshotSchema.parse({
      ...generated.content.narrative, automatic: true, names: generated.content.names, assets, digests,
      milestones, metadata: { ...discovered.metadata, milestonePolicy: "ai-v1", corpusHash },
    });
    // Check branch again after external calls, before publishing the snapshot.
    failure = "SOURCE_UNAVAILABLE";
    if (await getBranchSha(await loadRepository(config.repositoryId, repository.full_name), repository.default_branch) !== sha) {
      await finishSuperseded(job.id, job.leaseToken);
      return { status: "superseded" };
    }
    failure = "PERSISTENCE_FAILED";
    const saved = await serializable(async (tx) => {
      const current = await tx.projectIntegration.findUnique({ where: { projectId: job.projectId }, include: { project: true } });
      if (governanceEnabled()) {
        const policy = await tx.projectDisclosurePolicy.findUnique({ where: { projectId: job.projectId } });
        if ((policy?.revision ?? null) !== (disclosure?.revision ?? null)) return false;
      }
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
        repositoryFullName: repository.full_name, repositoryUrl: repository.private ? null : `https://github.com/${repository.full_name}`,
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
  } catch (error) {
    if (repositoryUnavailable) {
      await withdrawPublicProject(job.projectId);
      await finishSuperseded(job.id, job.leaseToken);
      return { status: "withdrawn" };
    }
    const exhausted = job.attempts >= MAX_ATTEMPTS;
    await getPrisma().projectSyncJob.updateMany({
      where: { id: job.id, leaseToken: job.leaseToken, status: "PROCESSING" },
      data: { status: exhausted ? "FAILED" : "QUEUED", error: `${failure}:${projectAiFailureCode(error)}`,
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

export async function withdrawPublicProject(projectId: string) {
  if (!projectIntegrationEnabled()) throw new Error("Integration disabled");
  await serializable(async (tx) => {
    await tx.projectIntegration.updateMany({ where: { projectId }, data: { enabled: false } });
    await tx.project.updateMany({ where: { id: projectId }, data: { showOnPortfolio: false, showOnCv: false } });
    await tx.projectKnowledge.updateMany({ where: { projectId }, data: { status: "RETIRED" } });
    await tx.documentArtifact.updateMany({ where: { status: "PUBLISHED" }, data: { status: "ARCHIVED", publishedAt: null } });
    if (governanceEnabled()) {
      const current = await tx.projectDisclosurePolicy.findUnique({ where: { projectId } });
      const policy = { ...(current ? disclosureSchema.parse(current.policy) : defaultDisclosure), mode: "INTERNAL" as const };
      await tx.projectDisclosurePolicy.upsert({ where: { projectId }, create: { projectId, revision: randomUUID(), policy }, update: { revision: randomUUID(), policy } });
    }
  });
  revalidateTag("portfolio", { expire: 0 });
}
