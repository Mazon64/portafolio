import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";
import { config, proxy } from "./proxy";

function redirectFor(path: string, acceptLanguage?: string) {
  const request = new NextRequest(`https://example.com${path}`, {
    headers: acceptLanguage ? { "accept-language": acceptLanguage } : undefined,
  });

  return proxy(request)?.headers.get("location");
}

describe("locale proxy", () => {
  it.each(["/es", "/en", "/fr", "/cv", "/es/cv", "/api/health"])(
    "does not run for %s",
    (url) => {
      expect(
        unstable_doesMiddlewareMatch({ config, nextConfig, url }),
      ).toBe(false);
    },
  );

  it("runs only for the root URL", () => {
    expect(
      unstable_doesMiddlewareMatch({ config, nextConfig, url: "/" }),
    ).toBe(true);
  });

  it("detects the preferred language at the root", () => {
    expect(redirectFor("/", "es-MX,en;q=0.8")).toBe("https://example.com/es");
    expect(redirectFor("/?view=grid", "en-US,es;q=0.8")).toBe(
      "https://example.com/en?view=grid",
    );
  });
});
