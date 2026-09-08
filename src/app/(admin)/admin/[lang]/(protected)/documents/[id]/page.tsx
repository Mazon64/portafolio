import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { CvDocument } from "@/components/cv/cv-document";
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
  "overflow-hidden rounded-2xl border border-border bg-muted/40 p-2 sm:p-6 lg:p-10";
const letterPaperClass =
  "mx-auto min-h-[min(11in,calc((100vw-2rem)*1.294))] w-full max-w-[8.5in] bg-white px-6 py-8 text-[0.9rem] leading-6 text-neutral-950 shadow-xl shadow-black/10 sm:px-12 sm:py-14 lg:px-[0.7in] lg:py-[0.65in]";

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
    <div>
      <Link href={`/admin/${lang}/documents`} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        {copy.backToDocuments}
      </Link>
      <div className="mt-8 flex flex-wrap items-start justify-between gap-5 border-b border-border pb-6">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{copy.kinds[artifact.kind]} · {artifact.locale} · v{artifact.version}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{artifact.title}</h1>
        </div>
        {artifact.kind === DocumentKind.PUBLIC_CV && artifact.status === DocumentStatus.DRAFT && (
          <PublishForm id={artifact.id} copy={copy} enabled />
        )}
      </div>
      <div className="mt-8">
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
        <article className={letterPaperClass}>
          <header className="border-b-2 border-neutral-900 pb-6">
            <h2 className="text-3xl leading-none font-semibold tracking-[-0.04em] sm:text-4xl">
              {value.name}
            </h2>
            <p className="mt-3 text-base font-medium text-neutral-700 sm:text-lg">
              {value.headline}
            </p>
            <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-neutral-600" aria-label={locale === "es" ? "Información de contacto" : "Contact information"}>
              {value.contact.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </header>
          <PreviewSection title={locale === "es" ? "Resumen" : "Summary"}><p>{value.summary}</p></PreviewSection>
          <PreviewSection title={locale === "es" ? "Habilidades" : "Skills"}><p>{value.skills.join(" · ")}</p></PreviewSection>
          {value.experience.length > 0 && <PreviewEntries title={locale === "es" ? "Experiencia" : "Experience"} entries={value.experience} />}
          {value.projects.length > 0 && <PreviewEntries title={locale === "es" ? "Proyectos" : "Projects"} entries={value.projects} />}
          {value.education.length > 0 && <PreviewEntries title={locale === "es" ? "Educación" : "Education"} entries={value.education} />}
        </article>
      </div>
    );
  }
  const value = coverLetterArtifactSchema.parse(artifact.content);
  return (
    <div className={reviewStageClass}>
      <article className={`${letterPaperClass} text-[0.95rem] leading-7`}>
        <header className="border-b border-neutral-300 pb-5">
          <h2 className="text-base font-semibold tracking-[-0.01em]">{value.subject}</h2>
        </header>
        <p className="mt-10">{value.salutation}</p>
        {value.paragraphs.map((paragraph, index) => <p key={index} className="mt-5">{paragraph}</p>)}
        <p className="mt-10">{value.closing}<br /><span className="font-semibold">{value.name}</span></p>
      </article>
    </div>
  );
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-6"><h3 className="border-b border-neutral-300 pb-2 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-neutral-700">{title}</h3><div className="mt-3 text-[0.86rem] leading-5.5 text-neutral-800">{children}</div></section>;
}

function PreviewEntries({ title, entries }: { title: string; entries: Array<{ title: string; subtitle: string; period: string; bullets: string[] }> }) {
  return <PreviewSection title={title}><div className="space-y-5">{entries.map((entry, index) => <div key={`${entry.title}-${index}`}><div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-5"><h4 className="font-semibold text-neutral-950">{entry.title}</h4><p className="shrink-0 text-xs text-neutral-600">{entry.period}</p></div><p className="mt-0.5 text-sm font-medium text-neutral-600">{entry.subtitle}</p>{entry.bullets.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-4 marker:text-neutral-500">{entry.bullets.map((bullet, bulletIndex) => <li key={bulletIndex} className="pl-1">{bullet}</li>)}</ul>}</div>)}</div></PreviewSection>;
}
