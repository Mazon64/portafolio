import { ArrowUpRightIcon, LockKeyholeIcon } from "lucide-react";
import { redirect } from "next/navigation";

import { AdminLocaleLinks } from "@/components/admin/locale-links";
import { AuthButton } from "@/components/admin/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getAdminIdentity } from "@/lib/auth/authorization";
import { adminCopy } from "@/i18n/admin";
import { hasLocale } from "@/i18n/config";

export default async function AdminLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ lang }, query, identity] = await Promise.all([
    params,
    searchParams,
    getAdminIdentity(),
  ]);
  if (!hasLocale(lang)) return null;
  if (identity) redirect(`/admin/${lang}`);

  const copy = adminCopy[lang];
  const error =
    query.error === "denied"
      ? copy.login.denied
      : query.error
        ? copy.login.failed
        : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[96rem] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a
            href={`/${lang}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`${copy.navigation.viewSite}. ${copy.navigation.newTab}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {copy.navigation.viewSite}
            <ArrowUpRightIcon className="size-4" aria-hidden="true" />
          </a>
          <div className="flex items-center gap-1">
            <AdminLocaleLinks locale={lang} labels={copy.preferences} />
            <ThemeSwitcher labels={copy.preferences} />
          </div>
        </div>
      </header>
      <main className="mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-[96rem] place-items-center px-5 py-16 sm:px-8 lg:px-12">
        <section className="w-full max-w-xl">
          <div className="mb-8 flex size-12 items-center justify-center rounded-2xl border border-border bg-muted/50">
            <LockKeyholeIcon aria-hidden="true" />
          </div>
          <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">
            {copy.login.eyebrow}
          </p>
          <h1 className="mt-5 max-w-lg text-4xl leading-[1.05] font-semibold tracking-[-0.045em] sm:text-6xl">
            {copy.login.title}
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
            {copy.login.description}
          </p>
          {error && (
            <p
              role="alert"
              className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <div className="mt-8">
            <AuthButton
              mode="sign-in"
              callbackUrl={`/admin/${lang}`}
              label={copy.login.action}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
