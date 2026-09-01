import "server-only";

import { Locale, SkillPresentation } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth/authorization";
import { getPrisma } from "@/lib/prisma";

export type AdminSkill = {
  id: string;
  updatedAt: string;
  categoryId: string;
  slug: string;
  iconKey: string;
  showOnPortfolio: boolean;
  showOnCv: boolean;
  order: number;
  esName: string;
  enName: string;
};

export type AdminSkillCategory = {
  id: string;
  updatedAt: string;
  slug: string;
  presentation: "ICON_TILES" | "BADGES";
  showOnPortfolio: boolean;
  showOnCv: boolean;
  order: number;
  esTitle: string;
  esDescription: string;
  enTitle: string;
  enDescription: string;
  skills: AdminSkill[];
};

export async function getAdminSkillCategories(): Promise<AdminSkillCategory[]> {
  await requireAdmin();
  const categories = await getPrisma().skillCategory.findMany({
    orderBy: { order: "asc" },
    include: {
      translations: true,
      skills: { orderBy: { order: "asc" }, include: { translations: true } },
    },
  });

  return categories.map((category) => {
    const es = category.translations.find(({ locale }) => locale === Locale.ES);
    const en = category.translations.find(({ locale }) => locale === Locale.EN);
    if (!es || !en) throw new Error(`Skill category ${category.slug} requires ES and EN.`);

    return {
      id: category.id,
      updatedAt: category.updatedAt.toISOString(),
      slug: category.slug,
      presentation: category.presentation,
      showOnPortfolio: category.showOnPortfolio,
      showOnCv: category.showOnCv,
      order: category.order,
      esTitle: es.title,
      esDescription: es.description,
      enTitle: en.title,
      enDescription: en.description,
      skills: category.skills.map((skill) => {
        const skillEs = skill.translations.find(({ locale }) => locale === Locale.ES);
        const skillEn = skill.translations.find(({ locale }) => locale === Locale.EN);
        if (!skillEs || !skillEn) throw new Error(`Skill ${skill.slug} requires ES and EN.`);
        return {
          id: skill.id,
          updatedAt: skill.updatedAt.toISOString(),
          categoryId: category.id,
          slug: skill.slug,
          iconKey: skill.iconKey ?? "",
          showOnPortfolio: skill.showOnPortfolio,
          showOnCv: skill.showOnCv,
          order: skill.order,
          esName: skillEs.name,
          enName: skillEn.name,
        };
      }),
    };
  });
}

type CategoryInput = Omit<AdminSkillCategory, "id" | "updatedAt" | "skills"> & {
  id?: string;
  updatedAt?: string;
};

export async function saveAdminSkillCategory(input: CategoryInput) {
  await requireAdmin();
  return getPrisma().$transaction(async (tx) => {
    let id = input.id;
    const data = {
      slug: input.slug,
      presentation: input.presentation === "BADGES" ? SkillPresentation.BADGES : SkillPresentation.ICON_TILES,
      showOnPortfolio: input.showOnPortfolio,
      showOnCv: input.showOnCv,
      order: input.order,
    };
    if (id && input.updatedAt) {
      const result = await tx.skillCategory.updateMany({
        where: { id, updatedAt: new Date(input.updatedAt) },
        data,
      });
      if (result.count !== 1) return null;
    } else {
      id = (await tx.skillCategory.create({ data, select: { id: true } })).id;
    }

    await Promise.all(
      ([Locale.ES, Locale.EN] as const).map((locale) => {
        const translation = locale === Locale.ES
          ? { title: input.esTitle, description: input.esDescription }
          : { title: input.enTitle, description: input.enDescription };
        return tx.skillCategoryTranslation.upsert({
          where: { categoryId_locale: { categoryId: id!, locale } },
          create: { categoryId: id!, locale, ...translation },
          update: translation,
        });
      }),
    );
    const saved = await tx.skillCategory.findUniqueOrThrow({
      where: { id },
      select: { updatedAt: true },
    });
    return { id, updatedAt: saved.updatedAt.toISOString() };
  });
}

type SkillInput = Omit<AdminSkill, "id" | "updatedAt"> & {
  id?: string;
  updatedAt?: string;
};

export async function saveAdminSkill(input: SkillInput) {
  await requireAdmin();
  return getPrisma().$transaction(async (tx) => {
    let id = input.id;
    const data = {
      categoryId: input.categoryId,
      slug: input.slug,
      iconKey: input.iconKey || null,
      showOnPortfolio: input.showOnPortfolio,
      showOnCv: input.showOnCv,
      order: input.order,
    };
    if (id && input.updatedAt) {
      const result = await tx.skill.updateMany({
        where: { id, updatedAt: new Date(input.updatedAt) },
        data,
      });
      if (result.count !== 1) return null;
    } else {
      id = (await tx.skill.create({ data, select: { id: true } })).id;
    }
    await Promise.all(
      ([Locale.ES, Locale.EN] as const).map((locale) => {
        const name = locale === Locale.ES ? input.esName : input.enName;
        return tx.skillTranslation.upsert({
          where: { skillId_locale: { skillId: id!, locale } },
          create: { skillId: id!, locale, name },
          update: { name },
        });
      }),
    );
    const saved = await tx.skill.findUniqueOrThrow({
      where: { id },
      select: { updatedAt: true },
    });
    return { id, updatedAt: saved.updatedAt.toISOString() };
  });
}

export async function deleteAdminSkillCategory(id: string, updatedAt: string) {
  await requireAdmin();
  return (await getPrisma().skillCategory.deleteMany({ where: { id, updatedAt: new Date(updatedAt) } })).count === 1;
}

export async function deleteAdminSkill(id: string, updatedAt: string) {
  await requireAdmin();
  return (await getPrisma().skill.deleteMany({ where: { id, updatedAt: new Date(updatedAt) } })).count === 1;
}
