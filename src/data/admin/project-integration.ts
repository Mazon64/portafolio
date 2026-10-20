import "server-only";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/authorization";
import { getPrisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import { resolveRepository } from "@/lib/projects/source";
import { repositoryCandidates } from "@/lib/projects/candidates";
import { privateDerivedDisclosure, defaultDisclosure } from "@/lib/projects/disclosure";
import { governanceEnabled } from "@/data/project-disclosure";
import { projectIntegrationEnabled } from "@/lib/projects/configuration";
import { integrationSchema, projectSnapshotSchema } from "@/lib/projects/schemas";
import { serializable } from "@/lib/projects/sync";

async function requireWrite() {
  await requireAdmin();
  if (!projectIntegrationEnabled()) throw new Error("Integration disabled");
}

export async function getAdminProjectIntegration(projectId: string) {
  await requireAdmin();
  const project = await getPrisma().project.findUnique({ where: { id: projectId }, include: { translations: true } });
  if (!project) return null;
  const [integration, jobs, published] = await Promise.all([
    getPrisma().projectIntegration.findUnique({ where: { projectId } }),
    getPrisma().projectSyncJob.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 8,
      select: { id: true, status: true, error: true, attempts: true, createdAt: true, requestedSha: true, availableAt: true } }),
    getPrisma().projectKnowledge.findFirst({ where: { projectId, status: "PUBLISHED" },
      select: { id: true, commitSha: true, publishedAt: true, narrative: true,
        chunks: { select: { path: true, sourceUrl: true }, distinct: ["path"], orderBy: { path: "asc" } } } }),
  ]);
  const snapshot = projectSnapshotSchema.safeParse(published?.narrative);
  return {
    project: { id: project.id, name: project.translations[0]?.name ?? project.slug, repositoryFullName: project.repositoryFullName ?? "", visible: project.showOnPortfolio },
    integration: integration ? { updatedAt: integration.updatedAt.toISOString(), enabled: integration.enabled, repositoryId: integration.repositoryId } : null,
    jobs: jobs.map((job) => ({ ...job, createdAt: job.createdAt.toISOString(), availableAt: job.availableAt.toISOString() })),
    published: published ? { id: published.id, commitSha: published.commitSha, publishedAt: published.publishedAt?.toISOString() ?? null, sources: published.chunks, snapshot: snapshot.success ? snapshot.data : null } : null,
  };
}
export type ProjectIntegrationWorkspace = NonNullable<Awaited<ReturnType<typeof getAdminProjectIntegration>>>;

export async function listRepositoryCandidates() {
  await requireAdmin();
  const [result, linked] = await Promise.all([
    repositoryCandidates(process.env.ADMIN_GITHUB_ID?.trim()),
    getPrisma().projectIntegration.findMany({ select: { repositoryId: true, projectId: true } }),
  ]);
  const projects = new Map(linked.map((row) => [row.repositoryId, row.projectId]));
  return { ...result, candidates: result.candidates.map((candidate) => ({ ...candidate, projectId: projects.get(candidate.id) ?? null })) };
}
export type RepositoryCandidates = Awaited<ReturnType<typeof listRepositoryCandidates>>;

// Links any repository the connector can read. A private one also needs the
// owner's explicit choice: publish an AI-derived description, or keep it internal.
export async function connectProjectRepository(identifier: string, options: { publishPrivate?: boolean } = {}) {
  await requireWrite();
  const { repository } = await resolveRepository(identifier);
  if (repository.private && !governanceEnabled()) throw new Error("Private repositories require disclosure governance");
  const owner = process.env.ADMIN_GITHUB_ID?.trim();
  const githubIds = owner && /^\d+$/.test(owner) ? [owner] : [];
  return serializable(async (tx) => {
    const linked = await tx.projectIntegration.findUnique({ where: { repositoryId: String(repository.id) } });
    if (linked) return linked.projectId;
    let project = await tx.project.findFirst({ where: { repositoryFullName: repository.full_name } });
    if (!project) {
      const baseSlug = repository.full_name.split("/")[1].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90) || "project";
      const collision = await tx.project.findUnique({ where: { slug: baseSlug }, select: { id: true } });
      project = await tx.project.create({ data: {
        slug: collision ? `${baseSlug}-${repository.id}` : baseSlug,
        repositoryFullName: repository.full_name, repositoryUrl: repository.private ? null : `https://github.com/${repository.full_name}`,
        showOnPortfolio: false, showOnCv: !repository.private,
        translations: { create: (["ES", "EN"] as const).map((locale) => ({
          locale, name: repository.name || repository.full_name, summary: repository.description || repository.full_name,
          detailedInfo: repository.description || repository.full_name,
        })) },
      } });
    }
    if (repository.private) {
      const current = await tx.projectDisclosurePolicy.findUnique({ where: { projectId: project.id } });
      // Never widen an existing policy; only a new project receives the chosen default.
      if (!current) {
        const policy = options.publishPrivate ? privateDerivedDisclosure(githubIds) : { ...defaultDisclosure, mode: "INTERNAL" as const, externalAi: "NONE" as const, participation: { ...defaultDisclosure.participation, githubIds } };
        await tx.projectDisclosurePolicy.create({ data: { projectId: project.id, revision: randomUUID(), policy } });
      }
    }
    await tx.projectIntegration.create({ data: {
      projectId: project.id, repositoryId: String(repository.id), branch: repository.default_branch,
      sourcePaths: [], enabled: true,
    } });
    return project.id;
  });
}

export async function saveProjectIntegration(input: z.infer<typeof integrationSchema>) {
  await requireWrite();
  const { repository } = await resolveRepository(input.repositoryFullName);
  return serializable(async (tx) => {
    const project = await tx.project.findUnique({ where: { id: input.projectId } });
    if (!project) return null;
    const current = await tx.projectIntegration.findUnique({ where: { projectId: input.projectId } });
    if ((current?.updatedAt.toISOString() ?? "") !== input.updatedAt) return null;
    const data = { repositoryId: String(repository.id), branch: repository.default_branch, enabled: input.enabled };
    const saved = await tx.projectIntegration.upsert({ where: { projectId: input.projectId },
      create: { projectId: input.projectId, sourcePaths: [], ...data }, update: data, select: { updatedAt: true } });
    await tx.project.update({ where: { id: input.projectId }, data: { repositoryFullName: repository.full_name } });
    return { updatedAt: saved.updatedAt.toISOString() };
  });
}

export async function retryProjectSync(projectId: string, jobId: string) {
  await requireWrite();
  return serializable(async (tx) => {
    const config = await tx.projectIntegration.findUnique({ where: { projectId } });
    if (!config?.enabled) return false;
    return (await tx.projectSyncJob.updateMany({
      where: { id: jobId, projectId, status: "FAILED", configurationUpdatedAt: config.updatedAt },
      data: { status: "QUEUED", requestedSha: null, attempts: 0, error: null, availableAt: new Date(), finishedAt: null },
    })).count === 1;
  });
}

export async function initializePortfolioPilot() {
  return connectProjectRepository("Mazon64/portafolio");
}
