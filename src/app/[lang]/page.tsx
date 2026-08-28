import { Suspense } from "react";
import { notFound } from "next/navigation";

import { PortfolioContent } from "@/components/portfolio/portfolio-content";
import { PortfolioSkeleton } from "@/components/portfolio/portfolio-skeleton";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function Home({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dictionary = await getDictionary(lang);

  return (
    <main id="main-content" tabIndex={-1}>
      <Suspense
        fallback={<PortfolioSkeleton label={dictionary.loading.portfolio} />}
      >
        <PortfolioContent locale={lang} dictionary={dictionary} />
      </Suspense>
    </main>
  );
}
