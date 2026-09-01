import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/en/profile",
}));
vi.mock("@/components/admin/locale-links", () => ({
  AdminLocaleLinks: () => <span>locale-selector</span>,
}));
vi.mock("@/components/admin/auth-button", () => ({
  AuthButton: () => <button>sign-out</button>,
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

import { adminCopy } from "@/i18n/admin";
import { AdminHeader } from "./admin-header";

describe("AdminHeader", () => {
  it("matches the public shell and identifies the current destination", () => {
    const html = renderToStaticMarkup(
      <AdminHeader locale="en" copy={adminCopy.en} />,
    );

    expect(html).toContain("sticky top-0");
    expect(html).toContain("max-w-[96rem]");
    expect(html).toMatch(/aria-current="page"[^>]+href="\/admin\/en\/profile"/);
    expect(html).toContain("bg-foreground text-background");
    expect(html).toContain('target="_blank"');
    expect(html).toContain("View portfolio. Opens in a new tab");
    expect(html).toContain("locale-selector");
    expect(html).toContain("theme-selector");
  });
});
