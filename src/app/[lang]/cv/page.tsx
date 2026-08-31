import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowLeftIcon } from "lucide-react";
import { notFound } from "next/navigation";

import { CvContent } from "@/components/cv/cv-content";
import { CvSkeleton } from "@/components/cv/cv-skeleton";
import { PrintButton } from "@/components/cv/print-button";
import { getSiteUrl } from "@/config/env";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

type CvPageProps = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({
  params,
}: CvPageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const { cv } = await getDictionary(lang);
  const siteUrl = getSiteUrl();

  return {
    ...cv.metadata,
    ...(siteUrl && {
      metadataBase: siteUrl,
      alternates: {
        canonical: `/${lang}/cv`,
        languages: {
          es: "/es/cv",
          en: "/en/cv",
        },
      },
    }),
  };
}

export default async function CvPage({ params }: CvPageProps) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const { cv } = await getDictionary(lang);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="cv-page min-h-[calc(100svh-4rem)] bg-muted/35 px-4 py-10 outline-none sm:px-8 sm:py-14"
    >
      <div
        data-print-hidden
        className="mx-auto mb-6 flex w-full max-w-[210mm] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <a
          href={`/${lang}`}
          className="inline-flex h-10 items-center gap-2 self-start rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          {cv.backToPortfolio}
        </a>
        <PrintButton label={cv.print} />
      </div>

      <Suspense fallback={<CvSkeleton label={cv.loading} />}>
        <CvContent locale={lang} copy={cv} />
      </Suspense>
    </main>
  );
}
