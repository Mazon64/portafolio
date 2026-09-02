import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("security headers", () => {
  it("protects every route against framing and unsafe content types", async () => {
    const rules = await nextConfig.headers?.();
    const globalHeaders = rules?.find((rule) => rule.source === "/(.*)")?.headers;

    expect(globalHeaders).toEqual(
      expect.arrayContaining([
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Strict-Transport-Security", value: "max-age=63072000" },
      ]),
    );
    expect(globalHeaders?.find((header) => header.key === "Content-Security-Policy")?.value)
      .toContain("frame-ancestors 'none'");
  });

  it("prevents indexing OAuth endpoints", async () => {
    const rules = await nextConfig.headers?.();

    expect(rules).toContainEqual({
      source: "/api/auth/:path*",
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    });
  });
});
