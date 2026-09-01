"use client";

import { ArrowUpRightIcon, MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { AdminLocaleLinks } from "@/components/admin/locale-links";
import { AuthButton } from "@/components/admin/auth-button";
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
import type { AdminCopy } from "@/i18n/admin";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function AdminHeader({
  locale,
  copy,
}: {
  locale: Locale;
  copy: AdminCopy;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = [
    { href: `/admin/${locale}`, label: copy.navigation.dashboard },
    { href: `/admin/${locale}/profile`, label: copy.navigation.profile },
    { href: `/admin/${locale}/experience`, label: copy.navigation.experience },
  ];

  function isCurrent(href: string) {
    return pathname === href;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[96rem] items-center gap-6 px-5 sm:px-8 lg:px-12">
        <Link
          href={`/admin/${locale}`}
          className="flex shrink-0 items-center gap-3 font-mono"
        >
          <span className="grid size-9 place-items-center rounded-full bg-foreground text-xs font-bold tracking-tight text-background">
            {siteConfig.initials}
          </span>
          <span className="hidden text-sm font-semibold tracking-tight sm:block">
            {copy.brand}
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 xl:flex" aria-label={copy.brand}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrent(item.href) ? "page" : undefined}
              className={cn(
                "rounded-md px-2.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isCurrent(item.href)
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
          <a
            href={`/${locale}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`${copy.navigation.viewSite}. ${copy.navigation.newTab}`}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {copy.navigation.viewSite}
            <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
          </a>
        </nav>

        <div className="hidden items-center gap-1 border-l border-border pl-3 xl:flex">
          <AdminLocaleLinks locale={locale} labels={copy.preferences} />
          <ThemeSwitcher labels={copy.preferences} />
          <AuthButton
            mode="sign-out"
            callbackUrl={`/admin/${locale}/login`}
            label={copy.navigation.signOut}
            compact
          />
        </div>

        <div className="ml-auto xl:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={
                <Button variant="outline" size="icon" aria-label={copy.navigation.menu} />
              }
            >
              <MenuIcon />
            </SheetTrigger>
            <SheetContent
              className="w-[min(88vw,24rem)] overflow-hidden"
              closeLabel={copy.navigation.close}
            >
              <SheetHeader className="shrink-0 border-b border-border px-6 py-5">
                <SheetTitle>{copy.navigation.menu}</SheetTitle>
                <SheetDescription>{copy.navigation.menuDescription}</SheetDescription>
              </SheetHeader>

              <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
                {items.map((item, index) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isCurrent(item.href) ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-4 border-b border-border px-2 py-4 text-base font-medium transition-colors",
                      isCurrent(item.href)
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {item.label}
                  </Link>
                ))}
                <a
                  href={`/${locale}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${copy.navigation.viewSite}. ${copy.navigation.newTab}`}
                  className="flex items-center gap-4 border-b border-border px-2 py-4 text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span className="font-mono text-xs">04</span>
                  <span className="flex flex-1 items-center justify-between gap-3">
                    {copy.navigation.viewSite}
                    <ArrowUpRightIcon className="size-4" aria-hidden="true" />
                  </span>
                </a>
              </nav>

              <div className="flex items-center justify-between border-t border-border p-6">
                <AdminLocaleLinks locale={locale} labels={copy.preferences} />
                <div className="flex items-center gap-1">
                  <ThemeSwitcher labels={copy.preferences} />
                  <AuthButton
                    mode="sign-out"
                    callbackUrl={`/admin/${locale}/login`}
                    label={copy.navigation.signOut}
                    compact
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
