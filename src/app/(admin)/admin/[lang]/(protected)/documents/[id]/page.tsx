import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { CvDocument } from "@/components/cv/cv-document";
import { PrintButton } from "@/components/cv/print-button";
import {
  AtsDocument,
  CoverLetterDocument,
} from "@/components/documents/artifact-document";
import { getAdminDocumentArtifact } from "@/data/admin/documents";
import { DocumentKind, DocumentStatus } from "@/generated/prisma/client";
import { adminCopy } from "@/i18n/admin";
import { getDictionary } from "@/i18n/dictionaries";
import { hasLocale } from "@/i18n/config";
import {
  atsArtifactSchema,
  coverLetterArtifactSchema,
  publicCvArtifactSchema,
} from "@/lib/documents/schemas";
import { PublishForm } from "../document-workspace";

const reviewStageClass =
  "document-review-stage overflow-hidden rounded-2xl border border-border bg-muted/40 p-2 sm:p-6 lg:p-10";

export default async function DocumentPreviewPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !z.uuid().safeParse(id).success) notFound();
  const artifact = await getAdminDocumentArtifact(id);
  if (!artifact) notFound();
  const artifactLocale = artifact.locale.toLowerCase() as "es" | "en";
  const dictionary = await getDictionary(artifactLocale);
  const copy = adminCopy[lang].documents;

  return (
    <div className="document-print-page">
      <div data-print-hidden>
        <Link href={`/admin/${lang}/documents`} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          {copy.backToDocuments}
        </Link>
        <div className="mt-8 flex flex-wrap items-start justify-between gap-5 border-b border-border pb-6">
          <div>
            <p className="font-mono text-xs text-muted-foreground">{copy.kinds[artifact.kind]} · {artifact.locale}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{artifact.title}</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <PrintButton label={copy.printPdf} documentTitle={artifact.title} />
            {artifact.kind === DocumentKind.PUBLIC_CV && artifact.status === DocumentStatus.DRAFT && (
              <PublishForm id={artifact.id} copy={copy} enabled />
            )}
          </div>
        </div>
      </div>
      <div className="mt-8 print:mt-0">
        <ArtifactContent artifact={artifact} locale={artifactLocale} cvCopy={dictionary.cv} />
      </div>
    </div>
  );
}

function ArtifactContent({ artifact, locale, cvCopy }: { artifact: NonNullable<Awaited<ReturnType<typeof getAdminDocumentArtifact>>>; locale: "es" | "en"; cvCopy: Awaited<ReturnType<typeof getDictionary>>["cv"] }) {
  if (artifact.kind === DocumentKind.PUBLIC_CV) {
    const value = publicCvArtifactSchema.parse(artifact.content);
    return (
      <div className={reviewStageClass}>
        <div className="[&_.cv-document]:min-h-[min(11in,calc((100vw-2rem)*1.294))] [&_.cv-document]:max-w-[8.5in]">
          <CvDocument portfolio={value.portfolio} locale={locale} copy={cvCopy} />
        </div>
      </div>
    );
  }
  if (artifact.kind === DocumentKind.ATS_CV) {
    const value = atsArtifactSchema.parse(artifact.content);
    return (
      <div className={reviewStageClass}>
        <AtsDocument value={value} locale={locale} />
      </div>
    );
  }
  const value = coverLetterArtifactSchema.parse(artifact.content);
  return (
    <div className={reviewStageClass}>
      <CoverLetterDocument value={value} />
    </div>
  );
}
