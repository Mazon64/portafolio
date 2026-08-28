"use client";

import { useEffect, useRef, useState } from "react";
import { MenuIcon } from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState<string | null>(null);
  const [drawerOffset, setDrawerOffset] = useState(0);
  const edgeSwipeRef = useRef<{ startX: number; startY: number } | null>(null);
  const drawerSwipeRef = useRef<{
    startX: number;
    startY: number;
    offset: number;
  } | null>(null);
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

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl max-xl:pointer-events-none max-xl:fixed max-xl:inset-x-0 max-xl:border-0 max-xl:bg-transparent max-xl:backdrop-blur-none">
      <div className="mx-auto flex h-16 w-full max-w-[96rem] items-center gap-6 px-5 sm:px-8 lg:px-12 max-xl:h-0 max-xl:p-0">
        <a
          href="#hero"
          aria-label={siteConfig.name}
          className="hidden shrink-0 items-center gap-3 font-heading xl:flex"
        >
          <span className="grid size-9 place-items-center rounded-full bg-foreground text-xs font-bold tracking-tight text-background">
            {siteConfig.initials}
          </span>
          <span className="hidden text-sm font-semibold tracking-tight sm:block">
            {siteConfig.name}
          </span>
        </a>

        <nav className="ml-auto hidden items-center gap-1 xl:flex">
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              aria-current={activeHref === item.href ? "location" : undefined}
              className={`rounded-md px-2.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeHref === item.href ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-1 border-l border-border pl-3 xl:flex">
          <LocaleSwitcher locale={locale} labels={preferenceLabels} />
          <ThemeSwitcher labels={themeLabels} />
        </div>

        <div className="pointer-events-auto fixed top-3 right-3 z-10 xl:hidden">
          <Sheet
            open={menuOpen}
            onOpenChange={(open) => {
              setMenuOpen(open);
              if (!open) setDrawerOffset(0);
            }}
          >
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label={labels.menu} />
              }
            >
              <MenuIcon />
            </SheetTrigger>
            <SheetContent
              className={`w-[min(88vw,24rem)] touch-pan-y overflow-hidden ${drawerOffset > 0 ? "transition-none" : ""}`}
              closeLabel={labels.close}
              style={{
                transform:
                  drawerOffset > 0
                    ? `translateX(${drawerOffset}px)`
                    : undefined,
              }}
              onPointerDown={(event) => {
                if (event.pointerType !== "touch") return;
                drawerSwipeRef.current = {
                  startX: event.clientX,
                  startY: event.clientY,
                  offset: 0,
                };
              }}
              onPointerMove={(event) => {
                const swipe = drawerSwipeRef.current;
                if (!swipe) return;

                const deltaX = Math.max(0, event.clientX - swipe.startX);
                const deltaY = Math.abs(event.clientY - swipe.startY);
                if (deltaY > deltaX) return;

                swipe.offset = deltaX;
                setDrawerOffset(deltaX);
              }}
              onPointerUp={() => {
                const offset = drawerSwipeRef.current?.offset ?? 0;
                drawerSwipeRef.current = null;
                if (offset >= 80) {
                  setMenuOpen(false);
                }
                setDrawerOffset(0);
              }}
              onPointerCancel={() => {
                drawerSwipeRef.current = null;
                setDrawerOffset(0);
              }}
            >
              <SheetHeader className="shrink-0 border-b border-border px-6 py-5">
                <SheetTitle>{labels.menu}</SheetTitle>
                <SheetDescription>{labels.menuDescription}</SheetDescription>
              </SheetHeader>

              <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
                {navigation.map((item, index) => (
                  <a
                    key={item.href}
                    href={item.href}
                    aria-current={activeHref === item.href ? "location" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-4 border-b border-border px-2 py-4 text-base font-medium transition-colors ${activeHref === item.href ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <span
                      className={`font-mono text-xs ${activeHref === item.href ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {item.label}
                  </a>
                ))}
              </nav>

              <div className="flex shrink-0 items-center justify-between border-t border-border p-6">
                <LocaleSwitcher locale={locale} labels={preferenceLabels} />
                <ThemeSwitcher labels={themeLabels} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-auto fixed inset-y-0 right-0 w-3 touch-pan-y xl:hidden"
        onPointerDown={(event) => {
          if (event.pointerType !== "touch" || menuOpen) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          edgeSwipeRef.current = {
            startX: event.clientX,
            startY: event.clientY,
          };
        }}
        onPointerMove={(event) => {
          const swipe = edgeSwipeRef.current;
          if (!swipe) return;

          const deltaX = swipe.startX - event.clientX;
          const deltaY = Math.abs(event.clientY - swipe.startY);
          if (deltaX >= 64 && deltaX > deltaY) {
            edgeSwipeRef.current = null;
            setMenuOpen(true);
          }
        }}
        onPointerUp={() => {
          edgeSwipeRef.current = null;
        }}
        onPointerCancel={() => {
          edgeSwipeRef.current = null;
        }}
      />
    </header>
  );
}
