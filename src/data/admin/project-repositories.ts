import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/authorization";
import { isCmsWriteEnabled } from "@/config/env";
import { governanceEnabled } from "@/data/project-disclosure";
import { getPrisma } from "@/lib/prisma";
import { installationReader } from "@/lib/projects/github-app";
import { disclosureSchema } from "@/lib/projects/disclosure";
import { serializable } from "@/lib/projects/sync";
import { MAX_SOURCE_BYTES, milestonesSchema } from "@/lib/projects/schemas";
import type { Prisma } from "@/generated/prisma/client";
import { generateProjectNarrative } from "@/lib/projects/ai";
import { resolveMilestones } from "@/lib/projects/milestones";
import { projectAiEnabled } from "@/lib/projects/configuration";

const sourcePath = z.string().max(240).regex(/^(?:[\w-]+\/)*[\w.-]+\.(md|txt|ts|tsx|js|jsx|py|go|rs|java|sql)$/i).refine((path) => !path.split("/").some((part) => part.startsWith(".")));
const connectSchema = z.object({ projectId: z.uuid(), installationId: z.string().regex(/^[1-9]\d{0,19}$/), repositoryId: z.string().regex(/^[1-9]\d{0,19}$/), paths: z.array(sourcePath).min(1).max(20) });
async function requireWrite() {
  await requireAdmin();
  if (!isCmsWriteEnabled() || !governanceEnabled()) throw new Error("Repository writes disabled");
}
export async function connectPrivateSource(value: unknown) {
  await requireWrite();
  const input = connectSchema.parse(value);
  const current = await getPrisma().projectDisclosurePolicy.findUniqueOrThrow({ where: { projectId: input.projectId } });
  const policy = disclosureSchema.parse(current.policy);
  if (["FULL", "EXCLUDED"].includes(policy.mode)) throw new Error("Private sources require an explicit restricted policy");
  const reader = await installationReader(input.installationId, input.repositoryId);
  return serializable(async (tx) => {
    const latest = await tx.projectDisclosurePolicy.findUniqueOrThrow({ where: { projectId: input.projectId } });
    if (latest.revision !== current.revision) throw new Error("Policy changed");
    const data = { installationId: input.installationId, fullName: reader.repository.full_name, visibility: reader.repository.visibility, enabled: true, sourcePaths: [...new Set(input.paths)] };
    return tx.projectRepository.upsert({ where: { projectId_repositoryId: { projectId: input.projectId, repositoryId: input.repositoryId } }, create: { projectId: input.projectId, repositoryId: input.repositoryId, ...data }, update: data, select: { id: true } });
  });
}
export async function importPrivateEvidence(repositoryId: string) {
  await requireWrite();
  return processPrivateEvidence(repositoryId);
}

async function processPrivateEvidence(repositoryId: string) {
  if (!isCmsWriteEnabled() || !governanceEnabled()) throw new Error("Repository writes disabled");
  z.uuid().parse(repositoryId);
  let source = await getPrisma().projectRepository.findUniqueOrThrow({ where: { id: repositoryId } });
  const config = await getPrisma().projectDisclosurePolicy.findUniqueOrThrow({ where: { projectId: source.projectId } });
  const policy = disclosureSchema.parse(config.policy);
  if (!source.enabled || !source.installationId || ["FULL", "EXCLUDED"].includes(policy.mode)) throw new Error("Source unavailable");
  const leaseToken = randomUUID();
  const claimed = await getPrisma().projectRepository.updateMany({ where: { id: source.id, enabled: true, updatedAt: source.updatedAt, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, data: { leaseToken, leaseUntil: new Date(Date.now() + 5 * 60_000) } });
  if (claimed.count !== 1) throw new Error("Source busy");
  source = await getPrisma().projectRepository.findUniqueOrThrow({ where: { id: source.id } });
  try {
    const reader = await installationReader(source.installationId!, source.repositoryId);
    const branch = z.object({ commit: z.object({ sha: z.string().regex(/^[a-f0-9]{40}$/) }) }).parse(await reader.read(`/branches/${encodeURIComponent(reader.repository.default_branch)}`));
    const evidence: Prisma.ProjectEvidenceCreateManyInput[] = [];
    let bytes = 0;
    for (const path of source.sourcePaths) {
      sourcePath.parse(path);
      const file = z.object({ type: z.literal("file"), encoding: z.literal("base64"), content: z.string(), size: z.number().max(MAX_SOURCE_BYTES) }).parse(await reader.read(`/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${branch.commit.sha}`));
      const buffer = Buffer.from(file.content.replace(/\s/g, ""), "base64");
      bytes += buffer.byteLength;
      if (bytes > MAX_SOURCE_BYTES) throw new Error("Private evidence budget exceeded");
      evidence.push({ projectId: source.projectId, repositoryId: source.id, policyRevision: config.revision, commitSha: branch.commit.sha, path, content: buffer.toString("utf8"), sourceHash: createHash("sha256").update(buffer).digest("hex") });
    }
    await serializable(async (tx) => {
      const current = await tx.projectDisclosurePolicy.findUniqueOrThrow({ where: { projectId: source.projectId } });
      const repository = await tx.projectRepository.findUniqueOrThrow({ where: { id: source.id } });
      if (current.revision !== config.revision || !repository.enabled || repository.leaseToken !== leaseToken || !repository.leaseUntil || repository.leaseUntil.getTime() <= Date.now() || repository.updatedAt.getTime() !== source.updatedAt.getTime()) throw new Error("Source or policy changed");
      await tx.projectEvidence.deleteMany({ where: { repositoryId: source.id } });
      await tx.projectEvidence.createMany({ data: evidence });
    });
    // External processing is a separate grant from acquisition and publication.
    // Suggestions remain internal; the public generator never retrieves evidence.
    if (policy.externalAi === "PRIVATE_SELECTED" && projectAiEnabled()) {
      const processingPolicy = await getPrisma().projectDisclosurePolicy.findUniqueOrThrow({ where: { projectId: source.projectId } });
      if (processingPolicy.revision !== config.revision) throw new Error("Processing permission changed");
      const chunks = evidence.map((item) => ({ path: item.path, ordinal: 0, content: item.content, sourceHash: item.sourceHash, sourceUrl: `https://github.com/${reader.repository.full_name}/blob/${branch.commit.sha}/${item.path.split("/").map(encodeURIComponent).join("/")}` }));
      const previous = z.object({ policyRevision: z.string(), milestones: milestonesSchema }).safeParse(source.analysis);
      const previousMilestones = previous.success && previous.data.policyRevision === config.revision ? previous.data.milestones : [];
      const generated = await generateProjectNarrative(chunks, { assets: [], previousMilestones, repositoryName: reader.repository.full_name });
      const milestones = resolveMilestones(generated.content.milestones, chunks, previousMilestones);
      await serializable(async (tx) => {
        const latest = await tx.projectDisclosurePolicy.findUniqueOrThrow({ where: { projectId: source.projectId } });
        if (latest.revision !== config.revision) throw new Error("Policy changed");
        const saved = await tx.projectRepository.updateMany({ where: { id: source.id, enabled: true, updatedAt: source.updatedAt, leaseToken, leaseUntil: { gt: new Date() } }, data: { analysis: { policyRevision: config.revision, commitSha: branch.commit.sha, ...generated.content, milestones } } });
        if (saved.count !== 1) throw new Error("Source changed");
      });
    }
    await getPrisma().projectRepository.updateMany({ where: { id: source.id, enabled: true, leaseToken }, data: { lastSyncedAt: new Date() } });
    return { imported: evidence.length };
  } catch (error) {
    await getPrisma().projectRepository.updateMany({ where: { id: source.id, leaseToken }, data: { nextAttemptAt: new Date(Date.now() + 15 * 60_000) } });
    if (error instanceof Error && /GitHub App HTTP (401|403|404)/.test(error.message)) await serializable(async (tx) => {
      const owned = await tx.projectRepository.updateMany({ where: { id: source.id, leaseToken }, data: { enabled: false } });
      if (owned.count) await tx.projectDisclosurePolicy.updateMany({ where: { projectId: source.projectId, revision: config.revision }, data: { revision: randomUUID(), policy: { ...policy, mode: "INTERNAL" } } });
    });
    throw error;
  } finally {
    await getPrisma().projectRepository.updateMany({ where: { id: source.id, leaseToken }, data: { leaseToken: null, leaseUntil: null } });
  }
}

export async function reconcilePrivateEvidence() {
  if (!isCmsWriteEnabled() || !governanceEnabled()) return { status: "disabled" };
  const source = await getPrisma().projectRepository.findFirst({ where: { enabled: true, nextAttemptAt: { lte: new Date() }, AND: [{ OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, { OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: new Date(Date.now() - 86400_000) } }] }] }, orderBy: [{ lastSyncedAt: { sort: "asc", nulls: "first" } }, { id: "asc" }], select: { id: true } });
  if (!source) return { status: "idle" };
  try { await processPrivateEvidence(source.id); return { status: "succeeded" }; }
  catch { return { status: "retrying" }; }
}
export async function getPrivateSources(projectId: string) {
  await requireAdmin();
  if (!governanceEnabled()) return [];
  return getPrisma().projectRepository.findMany({ where: { projectId }, select: { id: true, fullName: true, visibility: true, enabled: true, analysis: true, evidence: { select: { path: true, content: true, commitSha: true }, orderBy: { path: "asc" } } } });
}
