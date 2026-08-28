import type { Locale } from "@/i18n/config";
import { formatMonthYear, getPresentLabel } from "@/lib/format-date-range";

export type TimelineItem = {
  key: string;
  title: string;
  subtitle: string;
  description?: string;
  startDate: string;
  endDate: string | null;
};

export function TimelineSection({
  items,
  locale,
}: {
  items: TimelineItem[];
  locale: Locale;
}) {
  return (
    <ol className="divide-y divide-border border-y border-border">
      {items.map((item) => (
        <li
          key={item.key}
          className="grid gap-5 py-8 md:grid-cols-[minmax(10rem,0.45fr)_minmax(0,1.55fr)]"
        >
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <time dateTime={item.startDate}>
              {formatMonthYear(item.startDate, locale)}
            </time>
            <span aria-hidden="true"> - </span>
            {item.endDate ? (
              <time dateTime={item.endDate}>
                {formatMonthYear(item.endDate, locale)}
              </time>
            ) : (
              <span>{getPresentLabel(locale)}</span>
            )}
          </p>
          <div>
            <h3 className="font-heading text-2xl font-semibold tracking-[-0.03em]">
              {item.title}
            </h3>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {item.subtitle}
            </p>
            {item.description && (
              <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">
                {item.description}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
