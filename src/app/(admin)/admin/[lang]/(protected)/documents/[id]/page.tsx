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
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">{artifact.title}</h1>
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
    return <div className="bg-muted/35 p-3 sm:p-8"><CvDocument portfolio={value.portfolio} locale={locale} copy={cvCopy} /></div>;
  }
  if (artifact.kind === DocumentKind.ATS_CV) {
    const value = atsArtifactSchema.parse(artifact.content);
    return (
      <article className="mx-auto max-w-4xl bg-white p-8 text-neutral-950 shadow-xl sm:p-14">
        <h2 className="text-4xl font-semibold">{value.name}</h2><p className="mt-2 text-lg">{value.headline}</p><p className="mt-3 text-sm text-neutral-600">{value.contact.join(" · ")}</p>
        <PreviewSection title={locale === "es" ? "Resumen" : "Summary"}><p>{value.summary}</p></PreviewSection>
        <PreviewSection title={locale === "es" ? "Habilidades" : "Skills"}><p>{value.skills.join(" · ")}</p></PreviewSection>
        {value.experience.length > 0 && <PreviewEntries title={locale === "es" ? "Experiencia" : "Experience"} entries={value.experience} />}
        {value.projects.length > 0 && <PreviewEntries title={locale === "es" ? "Proyectos" : "Projects"} entries={value.projects} />}
        {value.education.length > 0 && <PreviewEntries title={locale === "es" ? "Educación" : "Education"} entries={value.education} />}
      </article>
    );
  }
  const value = coverLetterArtifactSchema.parse(artifact.content);
  return <article className="mx-auto max-w-3xl bg-white p-8 leading-7 text-neutral-950 shadow-xl sm:p-14"><h2 className="text-xl font-semibold">{value.subject}</h2><p className="mt-8">{value.salutation}</p>{value.paragraphs.map((paragraph, index) => <p key={index} className="mt-5">{paragraph}</p>)}<p className="mt-8">{value.closing}<br />{value.name}</p></article>;
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-8 border-t border-neutral-300 pt-4"><h3 className="font-mono text-xs font-semibold uppercase tracking-widest">{title}</h3><div className="mt-3 text-sm leading-6">{children}</div></section>;
}

function PreviewEntries({ title, entries }: { title: string; entries: Array<{ title: string; subtitle: string; period: string; bullets: string[] }> }) {
  return <PreviewSection title={title}><div className="space-y-5">{entries.map((entry, index) => <div key={`${entry.title}-${index}`}><h4 className="font-semibold">{entry.title}</h4><p className="text-neutral-600">{entry.subtitle} · {entry.period}</p>{entry.bullets.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5">{entry.bullets.map((bullet, bulletIndex) => <li key={bulletIndex}>{bullet}</li>)}</ul>}</div>)}</div></PreviewSection>;
}
