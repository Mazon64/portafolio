import "server-only";

import { Locale, ProjectStatus } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth/authorization";
import { getPrisma } from "@/lib/prisma";

export type AdminProject = {
  id: string;
  updatedAt: string;
  slug: string;
  repositoryFullName: string;
  demoUrl: string;
  repositoryUrl: string;
  techStack: string;
  showOnPortfolio: boolean;
  showOnCv: boolean;
  order: number;
  status: keyof typeof ProjectStatus;
  progressPct: number;
  es: { name: string; summary: string; detailedInfo: string };
  en: { name: string; summary: string; detailedInfo: string };
};

export type AdminProjectInput = Omit<AdminProject, "id" | "updatedAt"> & {
  id?: string;
  updatedAt?: string;
};

export async function getAdminProjects(): Promise<AdminProject[]> {
  await requireAdmin();
  const records = await getPrisma().project.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: { translations: true },
  });
  return records.map((record) => {
    const es = record.translations.find(({ locale }) => locale === Locale.ES);
    const en = record.translations.find(({ locale }) => locale === Locale.EN);
    if (!es || !en) throw new Error(`Project ${record.slug} requires ES and EN.`);
    return {
      id: record.id,
      updatedAt: record.updatedAt.toISOString(),
      slug: record.slug,
      repositoryFullName: record.repositoryFullName ?? "",
      demoUrl: record.demoUrl ?? "",
      repositoryUrl: record.repositoryUrl ?? "",
      techStack: record.techStack.join(", "),
      showOnPortfolio: record.showOnPortfolio,
      showOnCv: record.showOnCv,
      order: record.order,
      status: record.status,
      progressPct: record.progressPct,
      es: { name: es.name, summary: es.summary, detailedInfo: es.detailedInfo },
      en: { name: en.name, summary: en.summary, detailedInfo: en.detailedInfo },
    };
  });
}

export async function saveAdminProject(input: AdminProjectInput) {
  await requireAdmin();
  return getPrisma().$transaction(async (tx) => {
    let id = input.id;
    const data = {
      slug: input.slug,
      repositoryFullName: input.repositoryFullName || null,
      demoUrl: input.demoUrl || null,
      repositoryUrl: input.repositoryUrl || null,
      techStack: input.techStack.split(",").map((item) => item.trim()).filter(Boolean),
      showOnPortfolio: input.showOnPortfolio,
      showOnCv: input.showOnCv,
      order: input.order,
      status: ProjectStatus[input.status],
      progressPct: input.progressPct,
    };
    if (id && input.updatedAt) {
      const result = await tx.project.updateMany({
        where: { id, updatedAt: new Date(input.updatedAt) },
        data,
      });
      if (result.count !== 1) return null;
    } else {
      id = (await tx.project.create({ data, select: { id: true } })).id;
    }
    await Promise.all(
      ([Locale.ES, Locale.EN] as const).map((locale) => {
        const translation = locale === Locale.ES ? input.es : input.en;
        return tx.projectTranslation.upsert({
          where: { projectId_locale: { projectId: id!, locale } },
          create: { projectId: id!, locale, ...translation },
          update: translation,
        });
      }),
    );
    const saved = await tx.project.findUniqueOrThrow({
      where: { id },
      select: { updatedAt: true },
    });
    return { id, updatedAt: saved.updatedAt.toISOString() };
  });
}

export async function deleteAdminProject(id: string, updatedAt: string) {
  await requireAdmin();
  return (await getPrisma().project.deleteMany({ where: { id, updatedAt: new Date(updatedAt) } })).count === 1;
}
