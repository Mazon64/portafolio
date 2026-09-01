import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig from "../next.config";
import { config, proxy } from "./proxy";

function redirectFor(path: string, acceptLanguage?: string, origin = "https://example.com") {
  const request = new NextRequest(`${origin}${path}`, {
    headers: acceptLanguage ? { "accept-language": acceptLanguage } : undefined,
  });

  return proxy(request)?.headers.get("location");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("locale proxy", () => {
  it.each(["/es", "/en", "/fr", "/cv", "/es/cv", "/api/health"])(
    "does not run for %s",
    (url) => {
      expect(
        unstable_doesMiddlewareMatch({ config, nextConfig, url }),
      ).toBe(false);
    },
  );

  it.each(["/", "/admin/es", "/api/auth/callback/github"])(
    "runs for canonical entry point %s",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, nextConfig, url })).toBe(true);
    },
  );

  it("redirects admin and OAuth requests to their configured canonical origin", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://preview.davidaranda.dev");

    expect(redirectFor("/admin/es?source=mobile")).toBe(
      "https://preview.davidaranda.dev/admin/es?source=mobile",
    );
    expect(redirectFor("/api/auth/signin/github")).toBe(
      "https://preview.davidaranda.dev/api/auth/signin/github",
    );
    expect(
      redirectFor("/admin/es", undefined, "https://preview.davidaranda.dev"),
    ).toBeNull();
  });

  it("detects the preferred language at the root", () => {
    expect(redirectFor("/", "es-MX,en;q=0.8")).toBe("https://example.com/es");
    expect(redirectFor("/?view=grid", "en-US,es;q=0.8")).toBe(
      "https://example.com/en?view=grid",
    );
  });
});
