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

export async function getAdminDocumentWorkspace(): Promise<AdminDocumentWorkspace> {
  await requireAdmin();
  try {
    const [context, artifacts] = await Promise.all([
      getPrisma().aiContextVersion.findFirst({ orderBy: { createdAt: "desc" } }),
      getPrisma().documentArtifact.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { application: { select: { company: true, role: true } } },
      }),
    ]);
    return {
      schemaReady: true,
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
      return { schemaReady: false, context: null, artifacts: [] };
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
  locale: Locale;
  title: string;
  content: Prisma.InputJsonValue;
  sourceHash: string;
  model: string;
}) {
  await requireAdmin();
  return withSerializationRetry(() =>
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
}

export async function createApplicationArtifacts(input: {
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
  return withSerializationRetry(() => getPrisma().$transaction(async (tx) => {
    const application = await tx.jobApplication.create({
      data: {
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
