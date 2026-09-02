import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getNextAuthUrl,
  isCmsWriteEnabled,
  isDocumentGenerationEnabled,
} from "./env";

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

  it("requires writes, an explicit generation flag, and Gemini credentials", () => {
    vi.stubEnv("CMS_WRITES_ENABLED", "true");
    vi.stubEnv("DOCUMENT_GENERATION_ENABLED", "true");
    vi.stubEnv("GEMINI_API_KEY", "secret");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(isDocumentGenerationEnabled()).toBe(true);

    vi.stubEnv("VERCEL_ENV", "preview");
    expect(isDocumentGenerationEnabled()).toBe(false);
  });
});

describe("NextAuth URL environment", () => {
  it("allows HTTP only for local development", () => {
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL_ENV", "");

    expect(getNextAuthUrl()?.origin).toBe("http://localhost:3000");

    vi.stubEnv("NEXTAUTH_URL", "http://example.com");
    expect(() => getNextAuthUrl()).toThrow("must use HTTPS outside localhost");
  });

  it("rejects credentials, paths, query strings, and fragments", () => {
    vi.stubEnv("VERCEL_ENV", "");

    for (const value of [
      "https://user:secret@example.com",
      "https://example.com/auth",
      "https://example.com?source=test",
      "https://example.com#auth",
    ]) {
      vi.stubEnv("NEXTAUTH_URL", value);
      expect(() => getNextAuthUrl()).toThrow("must contain only an origin");
    }
  });

  it("requires the canonical origin for each Vercel environment", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXTAUTH_URL", "https://preview.davidaranda.dev");
    expect(() => getNextAuthUrl()).toThrow("must be https://davidaranda.dev");

    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXTAUTH_URL", "https://preview.davidaranda.dev");
    expect(getNextAuthUrl()?.origin).toBe("https://preview.davidaranda.dev");
  });

  it("requires an explicit URL on Vercel", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXTAUTH_URL", "");

    expect(() => getNextAuthUrl()).toThrow("is required on Vercel");
  });
});
