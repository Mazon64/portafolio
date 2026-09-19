"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { CHAT_SECTIONS, type ChatContext } from "@/lib/chat/schemas";
import { ChatWidget } from "./chat-widget";

const noop = () => {};
const Context = createContext({
  location: { path: "/es", section: "hero", projectSlug: null } as ChatContext,
  open: false, setOpen: noop as (open: boolean) => void,
  setProject: noop as (slug: string | null) => void,
  dock: null as HTMLElement | null, setDock: noop as (node: HTMLDivElement | null) => void,
});
export const useSiteChat = () => useContext(Context);

export function SiteChatProvider({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  const pathname = usePathname();
  const [section, setSection] = useState<ChatContext["section"]>("hero");
  const [viewed, setViewed] = useState<{ path: string; slug: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [dock, setDock] = useState<HTMLElement | null>(null);
  const setProject = useCallback((slug: string | null) => setViewed(slug ? { path: pathname, slug } : null), [pathname]);
  const setChatDock = useCallback((node: HTMLDivElement | null) => setDock(node), []);
  useEffect(() => {
    let frame = 0;
    const scan = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const point = window.innerHeight * 0.35;
        for (const id of CHAT_SECTIONS) {
          const element = document.getElementById(id);
          if (!element) continue;
          const rect = element.getBoundingClientRect();
          if (rect.top <= point && rect.bottom > point) { setSection(id); break; }
        }
      });
    };
    const hash = () => { if (window.location.hash === "#chat") setOpen(true); scan(); };
    window.addEventListener("scroll", scan, { passive: true }); window.addEventListener("resize", scan); window.addEventListener("hashchange", hash);
    const observer = new MutationObserver(scan); observer.observe(document.body, { childList: true, subtree: true });
    hash();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("scroll", scan); window.removeEventListener("resize", scan); window.removeEventListener("hashchange", hash); };
  }, [pathname]);
  const location = useMemo<ChatContext>(() => ({
    path: (pathname === `/${locale}/cv` ? pathname : `/${locale}`) as ChatContext["path"],
    section: viewed?.path === pathname ? "projects" : pathname.endsWith("/cv") ? "cv" : section,
    projectSlug: viewed?.path === pathname ? viewed.slug : null,
  }), [pathname, locale, section, viewed]);
  return <Context.Provider value={{ location, open, setOpen, setProject, dock, setDock: setChatDock }}>
    {children}<ChatWidget locale={locale} />
  </Context.Provider>;
}
