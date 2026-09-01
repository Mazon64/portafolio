import "server-only";

import { Locale } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth/authorization";
import { getPrisma } from "@/lib/prisma";

export type AdminEducation = {
  id: string;
  updatedAt: string;
  slug: string;
  institution: string;
  startDate: string;
  endDate: string;
  showOnPortfolio: boolean;
  showOnCv: boolean;
  order: number;
  esDegree: string;
  enDegree: string;
};

export type AdminEducationInput = Omit<AdminEducation, "id" | "updatedAt"> & {
  id?: string;
  updatedAt?: string;
};

export async function getAdminEducation(): Promise<AdminEducation[]> {
  await requireAdmin();
  const records = await getPrisma().education.findMany({
    orderBy: [{ order: "asc" }, { startDate: "desc" }],
    include: { translations: true },
  });

  return records.map((record) => {
    const es = record.translations.find(({ locale }) => locale === Locale.ES);
    const en = record.translations.find(({ locale }) => locale === Locale.EN);
    if (!es || !en) throw new Error(`Education ${record.slug} requires ES and EN.`);

    return {
      id: record.id,
      updatedAt: record.updatedAt.toISOString(),
      slug: record.slug,
      institution: record.institution,
      startDate: record.startDate.toISOString().slice(0, 10),
      endDate: record.endDate?.toISOString().slice(0, 10) ?? "",
      showOnPortfolio: record.showOnPortfolio,
      showOnCv: record.showOnCv,
      order: record.order,
      esDegree: es.degree,
      enDegree: en.degree,
    };
  });
}

export async function saveAdminEducation(
  input: AdminEducationInput,
): Promise<{ id: string; updatedAt: string } | null> {
  await requireAdmin();
  return getPrisma().$transaction(async (tx) => {
    let id = input.id;
    const data = {
      slug: input.slug,
      institution: input.institution,
      startDate: new Date(`${input.startDate}T00:00:00.000Z`),
      endDate: input.endDate ? new Date(`${input.endDate}T00:00:00.000Z`) : null,
      showOnPortfolio: input.showOnPortfolio,
      showOnCv: input.showOnCv,
      order: input.order,
    };

    if (id && input.updatedAt) {
      const result = await tx.education.updateMany({
        where: { id, updatedAt: new Date(input.updatedAt) },
        data,
      });
      if (result.count !== 1) return null;
    } else {
      const created = await tx.education.create({ data, select: { id: true } });
      id = created.id;
    }

    await Promise.all(
      ([Locale.ES, Locale.EN] as const).map((locale) => {
        const degree = locale === Locale.ES ? input.esDegree : input.enDegree;
        return tx.educationTranslation.upsert({
          where: { educationId_locale: { educationId: id!, locale } },
          create: { educationId: id!, locale, degree },
          update: { degree },
        });
      }),
    );
    const saved = await tx.education.findUniqueOrThrow({
      where: { id },
      select: { updatedAt: true },
    });
    return { id, updatedAt: saved.updatedAt.toISOString() };
  });
}

export async function deleteAdminEducation(id: string, updatedAt: string) {
  await requireAdmin();
  const result = await getPrisma().education.deleteMany({
    where: { id, updatedAt: new Date(updatedAt) },
  });
  return result.count === 1;
}
