import "server-only";

import { unstable_cache } from "next/cache";
import { connection } from "next/server";

import { Locale } from "@/generated/prisma/client";
import type { Locale as AppLocale } from "@/i18n/config";
import { getPrisma } from "@/lib/prisma";
import { normalizePortfolio } from "./normalize-portfolio";
import type { PortfolioDto, RawPortfolioData } from "./portfolio.types";

const databaseLocale: Record<AppLocale, Locale> = {
  es: Locale.ES,
  en: Locale.EN,
};

async function queryPortfolioContent(locale: AppLocale): Promise<PortfolioDto> {
  const prisma = getPrisma();
  const selectedLocale = databaseLocale[locale];
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
          linkedinUrl: true,
          githubUrl: true,
          translations: {
            ...translation,
            select: { title: true, longBio: true, contactText: true },
          },
        },
      }),
      prisma.experience.findMany({
        where: { showOnPortfolio: true },
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
        where: { showOnPortfolio: true },
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
        where: { showOnPortfolio: true },
        orderBy: [
          { order: "asc" },
          { createdAt: "desc" },
          { slug: "asc" },
        ],
        select: {
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
        where: { showOnPortfolio: true },
        orderBy: [{ order: "asc" }, { slug: "asc" }],
        select: {
          slug: true,
          presentation: true,
          translations: {
            ...translation,
            select: { title: true, description: true },
          },
          skills: {
            where: { showOnPortfolio: true },
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

  return normalizePortfolio({
    profile,
    experience,
    education,
    projects,
    skillCategories,
  } satisfies RawPortfolioData);
}

const getCachedPortfolioContent = unstable_cache(
  queryPortfolioContent,
  ["portfolio"],
  { tags: ["portfolio"], revalidate: 300 },
);

export async function getPortfolioContent(
  locale: AppLocale,
): Promise<PortfolioDto> {
  await connection();
  return getCachedPortfolioContent(locale);
}

export type { PortfolioDto } from "./portfolio.types";
