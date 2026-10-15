import "server-only";

import { connection } from "next/server";

import { DocumentKind, DocumentStatus, Locale } from "@/generated/prisma/client";
import type { Locale as AppLocale } from "@/i18n/config";
import { getPrisma } from "@/lib/prisma";
import { publicCvArtifactSchema } from "@/lib/documents/schemas";
import type { PortfolioDto } from "./portfolio.types";
import { applyProjectDisclosure, governanceEnabled, publicationVersion } from "./project-disclosure";

const databaseLocale: Record<AppLocale, Locale> = { es: Locale.ES, en: Locale.EN };

export function isDocumentSchemaUnavailable(error: unknown): boolean {
  return (error as { code?: string })?.code === "P2021";
}

export async function getPublishedGeneratedCv(
  locale: AppLocale,
): Promise<PortfolioDto | null> {
  await connection();
  try {
    const artifact = await getPrisma().documentArtifact.findFirst({
      where: {
        kind: DocumentKind.PUBLIC_CV,
        locale: databaseLocale[locale],
        status: DocumentStatus.PUBLISHED,
      },
      orderBy: { publishedAt: "desc" },
       select: { content: true, ...(governanceEnabled() ? { publicationVersion: true } : {}) },
    });
    if (!artifact) return null;
    if (governanceEnabled() && artifact.publicationVersion !== await publicationVersion()) return null;
    return applyProjectDisclosure(publicCvArtifactSchema.parse(artifact.content).portfolio, locale, "cv");
  } catch (error) {
    if (isDocumentSchemaUnavailable(error)) return null;
    throw error;
  }
}
