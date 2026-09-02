import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { getCvContent } from "@/data/portfolio";
import { getPublishedGeneratedCv } from "@/data/generated-documents";

import { CvDocument } from "./cv-document";

export async function CvContent({
  locale,
  copy,
}: {
  locale: Locale;
  copy: Dictionary["cv"];
}) {
  const portfolio =
    (await getPublishedGeneratedCv(locale)) ?? (await getCvContent(locale));

  return <CvDocument portfolio={portfolio} locale={locale} copy={copy} />;
}
