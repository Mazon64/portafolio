import "server-only";
import { z } from "zod";
import { Locale } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth/authorization";
import { getPrisma } from "@/lib/prisma";
import { getRepository } from "@/lib/projects/github";
import { projectIntegrationEnabled } from "@/lib/projects/configuration";
import { assetsSchema, integrationSchema, milestoneProgress, milestonesSchema, narrativeSchema, narrativeText, type ProjectNarrative } from "@/lib/projects/schemas";
import { serializable } from "@/lib/projects/sync";

async function requireWrite() {
  await requireAdmin();
  if (!projectIntegrationEnabled()) throw new Error("Integration disabled");
}

export async function getAdminProjectIntegration(projectId: string) {
  await requireAdmin();
  const project = await getPrisma().project.findUnique({ where: { id: projectId }, include: { translations: true } });
  if (!project) return null;
  const [integration, jobs, knowledge] = await Promise.all([
    getPrisma().projectIntegration.findUnique({ where: { projectId } }),
    getPrisma().projectSyncJob.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 8,
      select: { id: true, status: true, error: true, attempts: true, createdAt: true, requestedSha: true, availableAt: true } }),
    getPrisma().projectKnowledge.findMany({ where: { projectId },
      select: { id: true, status: true, commitSha: true, createdAt: true, narrative: true,
        chunks: { select: { path: true, sourceUrl: true }, distinct: ["path"], orderBy: { path: "asc" } } } }),
  ]);
  return {
    project: { id: project.id, name: project.translations[0]?.name ?? project.slug, repositoryFullName: project.repositoryFullName ?? "", visible: project.showOnPortfolio },
    integration: integration ? {
      updatedAt: integration.updatedAt.toISOString(), branch: integration.branch, enabled: integration.enabled,
      repositoryId: integration.repositoryId, sourcePaths: integration.sourcePaths,
      assets: assetsSchema.parse(integration.assets), milestones: milestonesSchema.parse(integration.milestones),
    } : null,
    jobs: jobs.map((job) => ({ ...job, createdAt: job.createdAt.toISOString(), availableAt: job.availableAt.toISOString() })),
    knowledge: knowledge.map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), narrative: narrativeSchema.parse(item.narrative) })),
  };
}
export type ProjectIntegrationWorkspace = NonNullable<Awaited<ReturnType<typeof getAdminProjectIntegration>>>;

export async function saveProjectIntegration(input: z.infer<typeof integrationSchema>) {
  await requireWrite();
  const repository = await getRepository(input.repositoryFullName);
  return serializable(async (tx) => {
    const project = await tx.project.findUnique({ where: { id: input.projectId } });
    if (!project) return null;
    const current = await tx.projectIntegration.findUnique({ where: { projectId: input.projectId } });
    if ((current?.updatedAt.toISOString() ?? "") !== input.updatedAt) return null;
    const data = {
      repositoryId: String(repository.id), branch: input.branch, sourcePaths: input.sourcePaths,
      enabled: input.enabled, assets: input.assets, milestones: input.milestones,
    };
    const saved = await tx.projectIntegration.upsert({ where: { projectId: input.projectId }, create: { projectId: input.projectId, ...data }, update: data, select: { updatedAt: true } });
    await tx.project.update({ where: { id: input.projectId }, data: {
      repositoryFullName: repository.full_name,
      ...(milestoneProgress(input.milestones) === null ? {} : { progressPct: milestoneProgress(input.milestones)! }),
    } });
    // Old private drafts no longer describe this configuration; published data is retained.
    await tx.projectKnowledge.deleteMany({ where: { projectId: input.projectId, status: "DRAFT" } });
    return { updatedAt: saved.updatedAt.toISOString() };
  });
}

export async function publishProjectKnowledge(projectId: string, knowledgeId: string, content: ProjectNarrative) {
  await requireWrite();
  const config = await getPrisma().projectIntegration.findUnique({ where: { projectId } });
  if (!config?.enabled) return false;
  await getRepository(config.repositoryId);
  return serializable(async (tx) => {
    const draft = await tx.projectKnowledge.findFirst({ where: { id: knowledgeId, projectId, status: "DRAFT" } });
    const current = await tx.projectIntegration.findUnique({ where: { projectId }, include: { project: true } });
    if (!draft || !current?.enabled || current.updatedAt.getTime() !== draft.configurationUpdatedAt.getTime() ||
      current.project.updatedAt.getTime() !== draft.projectUpdatedAt.getTime()) return false;
    await tx.projectKnowledge.deleteMany({ where: { projectId, status: "PUBLISHED" } });
    await tx.projectKnowledge.update({ where: { id: draft.id }, data: { status: "PUBLISHED", narrative: content, publishedAt: new Date() } });
    for (const locale of [Locale.ES, Locale.EN]) {
      const key = locale === Locale.ES ? "es" : "en";
      await tx.projectTranslation.update({ where: { projectId_locale: { projectId, locale } }, data: {
        summary: content[key].summary, detailedInfo: narrativeText(content, key),
      } });
    }
    await tx.project.update({ where: { id: projectId }, data: { showOnPortfolio: true } });
    return true;
  });
}

export async function discardProjectKnowledge(projectId: string, knowledgeId: string) {
  await requireWrite();
  return (await getPrisma().projectKnowledge.deleteMany({ where: { id: knowledgeId, projectId, status: "DRAFT" } })).count === 1;
}

export async function retryProjectSync(projectId: string, jobId: string) {
  await requireWrite();
  return serializable(async (tx) => {
    const config = await tx.projectIntegration.findUnique({ where: { projectId } });
    if (!config?.enabled) return false;
    return (await tx.projectSyncJob.updateMany({
      where: { id: jobId, projectId, status: "FAILED", configurationUpdatedAt: config.updatedAt },
      data: { status: "QUEUED", attempts: 0, error: null, availableAt: new Date(), finishedAt: null },
    })).count === 1;
  });
}

export async function initializePortfolioPilot() {
  await requireWrite();
  const repository = await getRepository("Mazon64/portafolio");
  const existing = await getPrisma().project.findFirst({ where: { OR: [{ slug: "portafolio" }, { repositoryFullName: repository.full_name }] } });
  if (existing) {
    if (existing.repositoryFullName && existing.repositoryFullName !== repository.full_name) throw new Error("Pilot identifier is already in use");
    return existing.id;
  }
  return serializable(async (tx) => {
    const project = await tx.project.create({ data: {
      slug: "portafolio", repositoryFullName: repository.full_name, repositoryUrl: `https://github.com/${repository.full_name}`,
      demoUrl: "https://davidaranda.dev", techStack: ["Next.js", "React", "TypeScript", "PostgreSQL", "Prisma", "Vercel"],
      status: "IN_PROGRESS", showOnPortfolio: false, showOnCv: true, progressPct: 60,
      translations: { create: [
        { locale: "ES", name: "Portafolio profesional", summary: "Portafolio bilingüe con administración privada y documentos profesionales.", detailedInfo: "Aplicación Next.js con contenido administrado en PostgreSQL, autenticación GitHub y despliegues separados de Preview y Production." },
        { locale: "EN", name: "Professional portfolio", summary: "Bilingual portfolio with private administration and professional documents.", detailedInfo: "Next.js application with PostgreSQL-managed content, GitHub authentication, and separate Preview and Production deployments." },
      ] },
      integration: { create: {
        repositoryId: String(repository.id), branch: repository.default_branch, enabled: true,
        sourcePaths: ["README.md", "docs/architecture.md", "docs/srs.md", "docs/api_spec.md"],
        assets: [{ url: "/project-media/portfolio-architecture.svg", alt: { es: "Arquitectura del portafolio: navegador, Next.js, PostgreSQL y GitHub", en: "Portfolio architecture: browser, Next.js, PostgreSQL and GitHub" }, caption: { es: "Diagrama de arquitectura del proyecto; no es una captura de pantalla.", en: "Project architecture diagram; not a screenshot." } }],
        milestones: [
          { id: "portfolio", title: { es: "Portafolio ES/EN", en: "ES/EN portfolio" }, weight: 20, completed: true, evidence: "https://davidaranda.dev" },
          { id: "cms", title: { es: "Administración privada", en: "Private administration" }, weight: 20, completed: true, evidence: "https://github.com/Mazon64/portafolio" },
          { id: "documents", title: { es: "Documentos profesionales", en: "Professional documents" }, weight: 20, completed: true, evidence: "https://github.com/Mazon64/portafolio/pull/43" },
          { id: "sync", title: { es: "Sincronización verificada", en: "Verified synchronization" }, weight: 20, completed: false, evidence: "" },
          { id: "rag", title: { es: "RAG publicado y validado", en: "Published and validated RAG" }, weight: 20, completed: false, evidence: "" },
        ],
      } },
    }, select: { id: true } });
    return project.id;
  });
}
