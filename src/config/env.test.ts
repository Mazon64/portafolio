import { afterEach, describe, expect, it, vi } from "vitest";

import { isCmsWriteEnabled } from "./env";

afterEach(() => vi.unstubAllEnvs());

describe("CMS write environment", () => {
  it("allows explicitly enabled local and Production writes", () => {
    vi.stubEnv("CMS_WRITES_ENABLED", "true");
    vi.stubEnv("VERCEL_ENV", "");
    expect(isCmsWriteEnabled()).toBe(true);
    vi.stubEnv("VERCEL_ENV", "production");
    expect(isCmsWriteEnabled()).toBe(true);
  });

  it("keeps Preview read-only even when the flag is misconfigured", () => {
    vi.stubEnv("CMS_WRITES_ENABLED", "true");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(isCmsWriteEnabled()).toBe(false);
  });
});
