import "server-only";

import {
  DocumentKind,
  DocumentStatus,
  Locale,
  Prisma,
} from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth/authorization";
import { isDocumentSchemaUnavailable } from "@/data/generated-documents";
import { getPrisma } from "@/lib/prisma";

function isSerializationConflict(error: unknown) {
  const code = (error as { code?: string })?.code;
  return code === "P2002" || code === "P2034";
}

async function withSerializationRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === 2 || !isSerializationConflict(error)) throw error;
    }
  }
  throw new Error("Unreachable serialization retry state");
}

export type AdminDocumentWorkspace = {
  schemaReady: boolean;
  history: {
    page: number;
    totalPages: number;
    totalItems: number;
  };
  context: {
    professionalContext: string;
    personalContext: string;
    createdAt: string;
  } | null;
  artifacts: Array<{
    id: string;
    kind: DocumentKind;
    locale: Locale;
    status: DocumentStatus;
    version: number;
    title: string;
    sourceHash: string;
    createdAt: string;
    publishedAt: string | null;
    application: { company: string; role: string } | null;
  }>;
};

const documentHistoryPageSize = 6;

export async function getAdminDocumentWorkspace(requestedPage = 1): Promise<AdminDocumentWorkspace> {
  await requireAdmin();
  try {
    const [context, totalItems] = await Promise.all([
      getPrisma().aiContextVersion.findFirst({ orderBy: { createdAt: "desc" } }),
      getPrisma().documentArtifact.count(),
    ]);
    const totalPages = Math.max(1, Math.ceil(totalItems / documentHistoryPageSize));
    const page = Math.min(Math.max(1, Math.floor(requestedPage)), totalPages);
    const artifacts = await getPrisma().documentArtifact.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * documentHistoryPageSize,
      take: documentHistoryPageSize,
      include: { application: { select: { company: true, role: true } } },
    });
    return {
      schemaReady: true,
      history: { page, totalPages, totalItems },
      context: context
        ? {
            professionalContext: context.professionalContext,
            personalContext: context.personalContext,
            createdAt: context.createdAt.toISOString(),
          }
        : null,
      artifacts: artifacts.map((artifact) => ({
        id: artifact.id,
        kind: artifact.kind,
        locale: artifact.locale,
        status: artifact.status,
        version: artifact.version,
        title: artifact.title,
        sourceHash: artifact.sourceHash,
        createdAt: artifact.createdAt.toISOString(),
        publishedAt: artifact.publishedAt?.toISOString() ?? null,
        application: artifact.application,
      })),
    };
  } catch (error) {
    if (isDocumentSchemaUnavailable(error)) {
      return {
        schemaReady: false,
        history: { page: 1, totalPages: 1, totalItems: 0 },
        context: null,
        artifacts: [],
      };
    }
    throw error;
  }
}

export async function getLatestAiContext() {
  await requireAdmin();
  return getPrisma().aiContextVersion.findFirst({ orderBy: { createdAt: "desc" } });
}

export async function createAiContextVersion(
  professionalContext: string,
  personalContext: string,
) {
  await requireAdmin();
  return getPrisma().aiContextVersion.create({
    data: { professionalContext, personalContext },
    select: { id: true },
  });
}

export async function createPublicCvDraft(input: {
  id: string;
  locale: Locale;
  title: string;
  content: Prisma.InputJsonValue;
  sourceHash: string;
  model: string;
}) {
  await requireAdmin();
  const existing = await getPrisma().documentArtifact.findUnique({
    where: { id: input.id },
    select: { id: true, kind: true, locale: true, sourceHash: true, model: true },
  });
  if (existing) {
    if (
      existing.kind === DocumentKind.PUBLIC_CV &&
      existing.locale === input.locale &&
      existing.sourceHash === input.sourceHash &&
      existing.model === input.model
    ) return { id: existing.id };
    throw new Error("Draft identifier is already in use");
  }
  try {
    return await withSerializationRetry(() =>
      getPrisma().$transaction(
        async (tx) => {
          const latest = await tx.documentArtifact.aggregate({
            where: { kind: DocumentKind.PUBLIC_CV, locale: input.locale },
            _max: { version: true },
          });
          return tx.documentArtifact.create({
            data: {
              ...input,
              kind: DocumentKind.PUBLIC_CV,
              version: (latest._max.version ?? 0) + 1,
            },
            select: { id: true },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  } catch (error) {
    if (isSerializationConflict(error)) {
      const saved = await getPrisma().documentArtifact.findUnique({
        where: { id: input.id },
        select: { id: true, kind: true, locale: true, sourceHash: true, model: true },
      });
      if (
        saved?.kind === DocumentKind.PUBLIC_CV &&
        saved.locale === input.locale &&
        saved.sourceHash === input.sourceHash &&
        saved.model === input.model
      ) return { id: saved.id };
    }
    throw error;
  }
}

export async function createApplicationArtifacts(input: {
  id: string;
  locale: Locale;
  company: string;
  role: string;
  sourceUrl: string | null;
  jobDescription: string;
  notes: string | null;
  sourceHash: string;
  model: string;
  atsTitle: string;
  atsContent: Prisma.InputJsonValue;
  coverTitle: string;
  coverContent: Prisma.InputJsonValue;
}) {
  await requireAdmin();
  const existing = await getPrisma().jobApplication.findUnique({
    where: { id: input.id },
    select: {
      id: true,
      locale: true,
      company: true,
      role: true,
      sourceUrl: true,
      jobDescription: true,
      notes: true,
    },
  });
  if (existing) {
    if (
      existing.locale === input.locale &&
      existing.company === input.company &&
      existing.role === input.role &&
      existing.sourceUrl === input.sourceUrl &&
      existing.jobDescription === input.jobDescription &&
      existing.notes === input.notes
    ) return { id: existing.id };
    throw new Error("Draft identifier is already in use");
  }
  try {
    return await withSerializationRetry(() => getPrisma().$transaction(async (tx) => {
    const application = await tx.jobApplication.create({
      data: {
        id: input.id,
        locale: input.locale,
        company: input.company,
        role: input.role,
        sourceUrl: input.sourceUrl,
        jobDescription: input.jobDescription,
        notes: input.notes,
      },
      select: { id: true },
    });
    const [latestAts, latestCover] = await Promise.all([
      tx.documentArtifact.aggregate({
        where: { kind: DocumentKind.ATS_CV, locale: input.locale },
        _max: { version: true },
      }),
      tx.documentArtifact.aggregate({
        where: { kind: DocumentKind.COVER_LETTER, locale: input.locale },
        _max: { version: true },
      }),
    ]);
    await tx.documentArtifact.createMany({
      data: [
        {
          applicationId: application.id,
          kind: DocumentKind.ATS_CV,
          locale: input.locale,
          version: (latestAts._max.version ?? 0) + 1,
          title: input.atsTitle,
          content: input.atsContent,
          sourceHash: input.sourceHash,
          model: input.model,
        },
        {
          applicationId: application.id,
          kind: DocumentKind.COVER_LETTER,
          locale: input.locale,
          version: (latestCover._max.version ?? 0) + 1,
          title: input.coverTitle,
          content: input.coverContent,
          sourceHash: input.sourceHash,
          model: input.model,
        },
      ],
    });
    return application;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
  } catch (error) {
    if (isSerializationConflict(error)) {
      const saved = await getPrisma().jobApplication.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          locale: true,
          company: true,
          role: true,
          sourceUrl: true,
          jobDescription: true,
          notes: true,
        },
      });
      if (
        saved?.locale === input.locale &&
        saved.company === input.company &&
        saved.role === input.role &&
        saved.sourceUrl === input.sourceUrl &&
        saved.jobDescription === input.jobDescription &&
        saved.notes === input.notes
      ) return { id: saved.id };
    }
    throw error;
  }
}

export async function publishPublicCvArtifact(id: string) {
  await requireAdmin();
  return getPrisma().$transaction(async (tx) => {
    const artifact = await tx.documentArtifact.findUnique({
      where: { id },
      select: { kind: true, locale: true, status: true },
    });
    if (
      !artifact ||
      artifact.kind !== DocumentKind.PUBLIC_CV ||
      artifact.status !== DocumentStatus.DRAFT
    ) return false;

    await tx.documentArtifact.updateMany({
      where: {
        kind: DocumentKind.PUBLIC_CV,
        locale: artifact.locale,
        status: DocumentStatus.PUBLISHED,
        id: { not: id },
      },
      data: { status: DocumentStatus.ARCHIVED },
    });
    const result = await tx.documentArtifact.updateMany({
      where: {
        id,
        kind: DocumentKind.PUBLIC_CV,
        status: DocumentStatus.DRAFT,
      },
      data: {
        status: DocumentStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
    if (result.count !== 1) {
      throw new Error("Public CV draft changed during publication");
    }
    return true;
  });
}

export async function getAdminDocumentArtifact(id: string) {
  await requireAdmin();
  try {
    return await getPrisma().documentArtifact.findUnique({ where: { id } });
  } catch (error) {
    if (isDocumentSchemaUnavailable(error)) return null;
    throw error;
  }
}
