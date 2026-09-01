import { ArrowUpRightIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";

import { adminCopy } from "@/i18n/admin";
import { hasLocale } from "@/i18n/config";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) return null;
  const copy = adminCopy[lang].dashboard;

  return (
    <div>
      <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">{copy.eyebrow}</p>
      <h1 className="mt-4 max-w-3xl text-5xl leading-none font-semibold tracking-[-0.05em] sm:text-7xl">
        {copy.title}
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
        {copy.description}
      </p>

      <div className="mt-14 grid gap-5 md:grid-cols-2">
        <Link
          href={`/admin/${lang}/profile`}
          className="group rounded-3xl border border-border bg-card p-7 text-card-foreground transition-transform hover:-translate-y-1"
        >
          <div className="flex items-start justify-between gap-4">
            <UserRoundIcon className="size-7" aria-hidden="true" />
            <ArrowUpRightIcon className="size-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" aria-hidden="true" />
          </div>
          <h2 className="mt-12 text-2xl font-semibold tracking-[-0.03em]">{copy.profileTitle}</h2>
          <p className="mt-3 leading-7 text-muted-foreground">{copy.profileDescription}</p>
          <p className="mt-6 font-mono text-xs tracking-[0.16em] uppercase">{copy.edit}</p>
        </Link>

        <section className="rounded-3xl border border-dashed border-border p-7">
          <p className="font-mono text-xs tracking-[0.16em] text-muted-foreground">/NEXT</p>
          <h2 className="mt-12 text-2xl font-semibold tracking-[-0.03em]">{copy.nextTitle}</h2>
          <p className="mt-3 leading-7 text-muted-foreground">{copy.nextDescription}</p>
        </section>
      </div>
    </div>
  );
}
