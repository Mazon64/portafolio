export const locales = ["es", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const publicRouteSegments = ["cv"] as const;

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

export function getPathLocale(pathname: string): string | undefined {
  return pathname.split("/")[1] || undefined;
}

export function looksLikeLocale(value: string | undefined): boolean {
  return Boolean(value && /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(value));
}

export function isPublicRouteSegment(value: string | undefined): boolean {
  return publicRouteSegments.some((segment) => segment === value);
}

export function getLocalizedUrl(currentUrl: string, locale: Locale): string {
  const url = new URL(currentUrl);
  const segments = url.pathname.split("/");
  segments[1] = locale;
  url.pathname = segments.join("/") || `/${locale}`;

  return url.toString();
}
