import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/en",
}));
vi.mock("@/components/locale-switcher", () => ({
  LocaleSwitcher: () => <span>locale-selector</span>,
}));
vi.mock("@/components/theme-switcher", () => ({
  ThemeSwitcher: () => <span>theme-selector</span>,
}));
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { SiteHeader } from "./site-header";

const labels = {
  menu: "Menu",
  menuDescription: "Portfolio navigation",
  close: "Close",
  language: "Language",
  spanish: "Spanish",
  english: "English",
  theme: "Theme",
  system: "System",
  light: "Light",
  dark: "Dark",
};

describe("SiteHeader", () => {
  it("presents the CV as a separate CTA instead of a numbered section", () => {
    const html = renderToStaticMarkup(
      <SiteHeader
        locale="en"
        labels={labels}
        navigation={[
          { href: "#about", label: "About" },
          { href: "#skills", label: "Skills" },
          { href: "/en/cv", label: "View CV" },
        ]}
      />,
    );

    expect(html).toContain("rounded-full");
    expect(html).toContain("rounded-2xl");
    expect(html).toContain(">01<");
    expect(html).toContain(">02<");
    expect(html).not.toContain(">03<");
    expect(html.match(/View CV/g)).toHaveLength(2);
  });
});
