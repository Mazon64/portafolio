"use client";

import { useEffect, useState } from "react";
import { ArrowUpRightIcon, FileTextIcon, MenuIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { siteConfig } from "@/config/site";
import type { Locale } from "@/i18n/config";

type SiteHeaderProps = {
  locale: Locale;
  navigation: Array<{ href: string; label: string }>;
  labels: {
    menu: string;
    menuDescription: string;
    close: string;
    language: string;
    spanish: string;
    english: string;
    theme: string;
    system: string;
    light: string;
    dark: string;
  };
};

export function SiteHeader({
  locale,
  navigation,
  labels,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const portfolioPath = `/${locale}`;
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState<string | null>(null);
  const cvItem = navigation.find((item) => item.href.endsWith("/cv"));
  const sectionNavigation = navigation.filter((item) => item !== cvItem);
  const preferenceLabels = {
    language: labels.language,
    spanish: labels.spanish,
    english: labels.english,
  };
  const themeLabels = {
    theme: labels.theme,
    system: labels.system,
    light: labels.light,
    dark: labels.dark,
  };

  useEffect(() => {
    const updateActiveSection = () => {
      const activationLine = 80;
      let activeSection: string | null = null;

      for (const item of navigation) {
        if (!item.href.startsWith("#")) continue;
        const section = document.getElementById(item.href.slice(1));
        if (!section) continue;

        const bounds = section.getBoundingClientRect();
        if (bounds.top <= activationLine && bounds.bottom > activationLine) {
          activeSection = item.href;
          break;
        }
      }

      setActiveHref(activeSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [navigation]);

  function resolvedHref(href: string) {
    return href.startsWith("#") && pathname !== portfolioPath
      ? `${portfolioPath}${href}`
      : href;
  }

  function isCurrent(href: string) {
    return href.startsWith("#") ? activeHref === href : pathname === href;
  }

  return (
    <header
      data-print-hidden
      className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl max-xl:pointer-events-none max-xl:fixed max-xl:inset-x-0 max-xl:border-0 max-xl:bg-transparent max-xl:backdrop-blur-none"
    >
      <div className="mx-auto flex h-16 w-full max-w-[96rem] items-center gap-6 px-5 sm:px-8 lg:px-12 max-xl:h-0 max-xl:p-0">
        <a
          href={pathname === portfolioPath ? "#hero" : `${portfolioPath}#hero`}
          aria-label={siteConfig.name}
          className="hidden shrink-0 items-center gap-3 font-mono xl:flex"
        >
          <span className="grid size-9 place-items-center rounded-full bg-foreground text-xs font-bold tracking-tight text-background">
            {siteConfig.initials}
          </span>
          <span className="hidden text-sm font-semibold tracking-tight sm:block">
            {siteConfig.name}
          </span>
        </a>

        <nav className="ml-auto hidden items-center gap-1 xl:flex">
          {sectionNavigation.map((item) => (
            <a
              key={item.href}
              href={resolvedHref(item.href)}
              aria-current={
                isCurrent(item.href)
                  ? item.href.startsWith("#")
                    ? "location"
                    : "page"
                  : undefined
              }
              className={`inline-flex items-center rounded-md px-2.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isCurrent(item.href) ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {item.label}
            </a>
          ))}
          {cvItem && (
            <a
              href={resolvedHref(cvItem.href)}
              aria-current={isCurrent(cvItem.href) ? "page" : undefined}
              className="group ml-2 inline-flex items-center gap-2 rounded-full border border-foreground/25 bg-background px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-foreground shadow-[0_1px_0_color-mix(in_oklch,var(--foreground)_18%,transparent)] transition-all hover:-translate-y-0.5 hover:border-foreground/50 hover:shadow-[0_4px_14px_color-mix(in_oklch,var(--foreground)_12%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="grid size-6 place-items-center rounded-full bg-foreground text-background">
                <FileTextIcon className="size-3.5" aria-hidden="true" />
              </span>
              {cvItem.label}
              <ArrowUpRightIcon
                className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </a>
          )}
        </nav>

        <div className="hidden items-center gap-1 border-l border-border pl-3 xl:flex">
          <LocaleSwitcher locale={locale} labels={preferenceLabels} />
          <ThemeSwitcher labels={themeLabels} />
        </div>

        <div className="pointer-events-auto fixed top-3 right-3 z-10 xl:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={labels.menu}
                  className="bg-background/90 shadow-sm backdrop-blur"
                />
              }
            >
              <MenuIcon />
            </SheetTrigger>
            <SheetContent
              className="w-[min(88vw,24rem)] overflow-hidden"
              closeLabel={labels.close}
            >
              <SheetHeader className="shrink-0 border-b border-border px-6 py-5">
                <SheetTitle>{labels.menu}</SheetTitle>
                <SheetDescription>{labels.menuDescription}</SheetDescription>
              </SheetHeader>

              <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
                {sectionNavigation.map((item, index) => (
                  <a
                    key={item.href}
                    href={resolvedHref(item.href)}
                    aria-current={
                      isCurrent(item.href)
                        ? item.href.startsWith("#")
                          ? "location"
                          : "page"
                        : undefined
                    }
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-4 border-b border-border px-2 py-4 text-base font-medium transition-colors ${isCurrent(item.href) ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <span
                      className={`font-mono text-xs ${isCurrent(item.href) ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {item.label}
                  </a>
                ))}
                {cvItem && (
                  <a
                    href={resolvedHref(cvItem.href)}
                    aria-current={isCurrent(cvItem.href) ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className="group my-5 flex items-center gap-3 rounded-2xl border border-foreground/20 bg-muted/35 p-3 text-sm font-semibold text-foreground transition-all hover:border-foreground/40 hover:bg-muted"
                  >
                    <span className="grid size-10 place-items-center rounded-full bg-foreground text-background">
                      <FileTextIcon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="flex-1">{cvItem.label}</span>
                    <ArrowUpRightIcon
                      className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  </a>
                )}
              </nav>

              <div className="flex shrink-0 items-center justify-between border-t border-border p-6">
                <LocaleSwitcher locale={locale} labels={preferenceLabels} />
                <ThemeSwitcher labels={themeLabels} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
