import "server-only";

import { Locale } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth/authorization";
import { getPrisma } from "@/lib/prisma";

export type AdminExperience = {
  id: string;
  updatedAt: string;
  slug: string;
  company: string;
  startDate: string;
  endDate: string;
  showOnPortfolio: boolean;
  showOnCv: boolean;
  order: number;
  es: { role: string; description: string };
  en: { role: string; description: string };
};

export type AdminExperienceInput = Omit<AdminExperience, "id" | "updatedAt"> & {
  id?: string;
  updatedAt?: string;
};

export async function getAdminExperiences(): Promise<AdminExperience[]> {
  await requireAdmin();
  const records = await getPrisma().experience.findMany({
    orderBy: [{ order: "asc" }, { startDate: "desc" }],
    include: { translations: true },
  });

  return records.map((record) => {
    const es = record.translations.find(({ locale }) => locale === Locale.ES);
    const en = record.translations.find(({ locale }) => locale === Locale.EN);
    if (!es || !en) throw new Error(`Experience ${record.slug} requires ES and EN.`);

    return {
      id: record.id,
      updatedAt: record.updatedAt.toISOString(),
      slug: record.slug,
      company: record.company,
      startDate: record.startDate.toISOString().slice(0, 10),
      endDate: record.endDate?.toISOString().slice(0, 10) ?? "",
      showOnPortfolio: record.showOnPortfolio,
      showOnCv: record.showOnCv,
      order: record.order,
      es: { role: es.role, description: es.description },
      en: { role: en.role, description: en.description },
    };
  });
}

export async function saveAdminExperience(
  input: AdminExperienceInput,
): Promise<{ id: string; updatedAt: string } | null> {
  await requireAdmin();
  return getPrisma().$transaction(async (tx) => {
    let id = input.id;

    if (id && input.updatedAt) {
      const result = await tx.experience.updateMany({
        where: { id, updatedAt: new Date(input.updatedAt) },
        data: {
          slug: input.slug,
          company: input.company,
          startDate: new Date(`${input.startDate}T00:00:00.000Z`),
          endDate: input.endDate
            ? new Date(`${input.endDate}T00:00:00.000Z`)
            : null,
          showOnPortfolio: input.showOnPortfolio,
          showOnCv: input.showOnCv,
          order: input.order,
        },
      });
      if (result.count !== 1) return null;
    } else {
      const created = await tx.experience.create({
        data: {
          slug: input.slug,
          company: input.company,
          startDate: new Date(`${input.startDate}T00:00:00.000Z`),
          endDate: input.endDate
            ? new Date(`${input.endDate}T00:00:00.000Z`)
            : null,
          showOnPortfolio: input.showOnPortfolio,
          showOnCv: input.showOnCv,
          order: input.order,
        },
        select: { id: true },
      });
      id = created.id;
    }

    await Promise.all(
      ([Locale.ES, Locale.EN] as const).map((locale) => {
        const translation = locale === Locale.ES ? input.es : input.en;
        return tx.experienceTranslation.upsert({
          where: { experienceId_locale: { experienceId: id!, locale } },
          create: { experienceId: id!, locale, ...translation },
          update: translation,
        });
      }),
    );

    const saved = await tx.experience.findUniqueOrThrow({
      where: { id },
      select: { updatedAt: true },
    });
    return { id, updatedAt: saved.updatedAt.toISOString() };
  });
}

export async function deleteAdminExperience(
  id: string,
  updatedAt: string,
): Promise<boolean> {
  await requireAdmin();
  const result = await getPrisma().experience.deleteMany({
    where: { id, updatedAt: new Date(updatedAt) },
  });
  return result.count === 1;
}
