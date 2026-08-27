export const locales = ["es", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export function hasLocale(value: string): value is Locale {
  return locales.some((locale) => locale === value);
}

export function detectLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  const preferredLanguage = acceptLanguage
    .split(",")
    .map((entry, index) => {
      const [tag, ...parameters] = entry.trim().split(";");
      const qualityParameter = parameters.find((parameter) =>
        parameter.trim().startsWith("q="),
      );
      const parsedQuality = qualityParameter
        ? Number.parseFloat(qualityParameter.trim().slice(2))
        : 1;

      return {
        tag: tag.toLowerCase(),
        quality: Number.isFinite(parsedQuality) ? parsedQuality : 0,
        index,
      };
    })
    .filter(({ tag, quality }) => tag !== "*" && quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index)[0]?.tag;

  return preferredLanguage?.split("-")[0] === "es" ? "es" : defaultLocale;
}

export function getLocalizedUrl(currentUrl: string, locale: Locale): string {
  const url = new URL(currentUrl);
  const segments = url.pathname.split("/");
  segments[1] = locale;
  url.pathname = segments.join("/") || `/${locale}`;

  return url.toString();
}
