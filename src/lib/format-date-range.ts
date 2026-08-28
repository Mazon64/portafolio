import type { Locale } from "@/i18n/config";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateOnly(value: string): Date {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) throw new RangeError("Invalid date-only value.");

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(`${value}T00:00:00Z`);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError("Invalid date-only value.");
  }

  return date;
}

export function formatDateRange(
  startDate: string,
  endDate: string | null,
  locale: Locale,
): string {
  const start = formatMonthYear(startDate, locale);
  const end = endDate
    ? formatMonthYear(endDate, locale)
    : getPresentLabel(locale);

  return `${start} - ${end}`;
}

export function formatMonthYear(value: string, locale: Locale): string {
  const intlLocale = locale === "es" ? "es-MX" : "en-US";
  const formatter = new Intl.DateTimeFormat(intlLocale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return formatter.format(parseDateOnly(value));
}

export function getPresentLabel(locale: Locale): string {
  return locale === "es" ? "Actualidad" : "Present";
}
