import "server-only";

import { unstable_cache } from "next/cache";
import { connection } from "next/server";

import { Locale } from "@/generated/prisma/client";
import type { Locale as AppLocale } from "@/i18n/config";
import { getPrisma } from "@/lib/prisma";
import { normalizePortfolio } from "./normalize-portfolio";
import type { PortfolioDto, RawPortfolioData } from "./portfolio.types";
import { applyProjectDisclosure, disclosurePolicies, governanceEnabled, publicationVersion } from "./project-disclosure";

const databaseLocale: Record<AppLocale, Locale> = {
  es: Locale.ES,
  en: Locale.EN,
};

type ContentSurface = "portfolio" | "cv" | "documents";

async function queryPortfolioContent(
  locale: AppLocale,
  surface: ContentSurface,
): Promise<PortfolioDto> {
  const prisma = getPrisma();
  const version = governanceEnabled() ? await publicationVersion() : undefined;
  const selectedLocale = databaseLocale[locale];
  const visibility =
    surface !== "portfolio" ? { showOnCv: true } : { showOnPortfolio: true };
  const translation = {
    where: { locale: selectedLocale },
  } as const;

  const [profile, experience, education, projects, skillCategories] =
    await Promise.all([
      prisma.profile.findUnique({
        where: { slug: "main-profile" },
        select: {
          fullName: true,
          email: true,
          socialLinks: {
            where: { showOnPortfolio: true },
            orderBy: [{ order: "asc" }, { slug: "asc" }],
            select: {
              slug: true,
              label: true,
              detail: true,
              url: true,
              iconKey: true,
            },
          },
          translations: {
            ...translation,
            select: { title: true, longBio: true, contactText: true },
          },
        },
      }),
      prisma.experience.findMany({
        where: visibility,
        orderBy: [
          { order: "asc" },
          { startDate: "desc" },
          { slug: "asc" },
        ],
        select: {
          slug: true,
          company: true,
          startDate: true,
          endDate: true,
          translations: {
            ...translation,
            select: { role: true, description: true },
          },
        },
      }),
      prisma.education.findMany({
        where: visibility,
        orderBy: [
          { order: "asc" },
          { startDate: "desc" },
          { slug: "asc" },
        ],
        select: {
          slug: true,
          institution: true,
          startDate: true,
          endDate: true,
          translations: {
            ...translation,
            select: { degree: true },
          },
        },
      }),
      prisma.project.findMany({
        where: visibility,
        orderBy: [
          { order: "asc" },
          { createdAt: "desc" },
          { slug: "asc" },
        ],
        select: {
          id: true,
          slug: true,
          demoUrl: true,
          repositoryUrl: true,
          techStack: true,
          status: true,
          progressPct: true,
          lastTelemetryAt: true,
          translations: {
            ...translation,
            select: { name: true, summary: true, detailedInfo: true },
          },
        },
      }),
      prisma.skillCategory.findMany({
        where: visibility,
        orderBy: [{ order: "asc" }, { slug: "asc" }],
        select: {
          slug: true,
          presentation: true,
          translations: {
            ...translation,
            select: { title: true, description: true },
          },
          skills: {
            where: visibility,
            orderBy: [{ order: "asc" }, { slug: "asc" }],
            select: {
              slug: true,
              iconKey: true,
              translations: {
                ...translation,
                select: { name: true },
              },
            },
          },
        },
      }),
    ]);

  const normalized = normalizePortfolio({
    profile,
    experience,
    education,
    projects,
    skillCategories,
  } satisfies RawPortfolioData);
  if (!version) return normalized;
  const projected = await applyProjectDisclosure(normalized, locale, surface, new Map(projects.map((project) => [project.slug, project.id])));
  if (version !== await publicationVersion()) throw new Error("Publication changed");
  return projected;
}

const getCachedPortfolioContent = unstable_cache(
  (locale: AppLocale) => queryPortfolioContent(locale, "portfolio"),
  ["portfolio"],
  { tags: ["portfolio"], revalidate: 300 },
);

const getCachedCvContent = unstable_cache(
  (locale: AppLocale) => queryPortfolioContent(locale, "cv"),
  ["cv"],
  { tags: ["portfolio"], revalidate: 300 },
);

export async function getPortfolioContent(
  locale: AppLocale,
): Promise<PortfolioDto> {
  await connection();
  return governanceEnabled() ? queryPortfolioContent(locale, "portfolio") : getCachedPortfolioContent(locale);
}

export async function getCvContent(locale: AppLocale): Promise<PortfolioDto> {
  await connection();
  return governanceEnabled() ? queryPortfolioContent(locale, "cv") : getCachedCvContent(locale);
}

export type { PortfolioDto } from "./portfolio.types";

export async function getDocumentSourceContent(locale: AppLocale, surface: "cv" | "documents") {
  await connection();
  const version = await publicationVersion();
  const data = await queryPortfolioContent(locale, surface);
  const blocked = new Set((await disclosurePolicies()).filter((row) => row.policy.externalAi === "NONE").map((row) => row.slug));
  if (version !== await publicationVersion()) throw new Error("Publication changed");
  return { ...data, publicationVersion: version, projects: data.projects.filter((project) => !blocked.has(project.slug)) };
}
