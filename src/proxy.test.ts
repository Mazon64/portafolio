import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

function redirectFor(path: string, acceptLanguage?: string) {
  const request = new NextRequest(`https://example.com${path}`, {
    headers: acceptLanguage ? { "accept-language": acceptLanguage } : undefined,
  });

  return proxy(request)?.headers.get("location");
}

describe("locale proxy", () => {
  it("keeps explicit supported locales", () => {
    expect(redirectFor("/es", "en")).toBeUndefined();
    expect(redirectFor("/en/projects", "es")).toBeUndefined();
  });

  it("detects the preferred language for unprefixed routes", () => {
    expect(redirectFor("/", "es-MX,en;q=0.8")).toBe("https://example.com/es");
    expect(redirectFor("/projects?view=grid", "en-US,es;q=0.8")).toBe(
      "https://example.com/en/projects?view=grid",
    );
    expect(redirectFor("/cv", "es-MX,en;q=0.8")).toBe(
      "https://example.com/es/cv",
    );
  });

  it("falls back unsupported locale prefixes to English", () => {
    expect(redirectFor("/fr", "es")).toBe("https://example.com/en");
    expect(redirectFor("/pt-BR/projects", "es")).toBe(
      "https://example.com/en/projects",
    );
  });
});
