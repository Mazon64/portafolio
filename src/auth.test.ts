import type { Profile } from "next-auth";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isAllowedGithubProfile, isSessionWithinAbsoluteLifetime } from "./auth";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("absolute session lifetime", () => {
  it("accepts sessions younger than 12 hours", () => {
    expect(isSessionWithinAbsoluteLifetime(1_000, 1_000 + 12 * 60 * 60 * 1_000 - 1)).toBe(
      true,
    );
  });

  it("rejects expired, future, and legacy sessions without a start time", () => {
    expect(isSessionWithinAbsoluteLifetime(1_000, 1_000 + 12 * 60 * 60 * 1_000)).toBe(
      false,
    );
    expect(isSessionWithinAbsoluteLifetime(2_000, 1_000)).toBe(false);
    expect(isSessionWithinAbsoluteLifetime(undefined, 1_000)).toBe(false);
  });
});

describe("GitHub authorization", () => {
  it("accepts only the configured numeric GitHub ID", () => {
    vi.stubEnv("ADMIN_GITHUB_ID", "123456");

    expect(isAllowedGithubProfile({ id: 123456 } as Profile)).toBe(true);
    expect(isAllowedGithubProfile({ id: 654321 } as Profile)).toBe(false);
    expect(isAllowedGithubProfile(undefined)).toBe(false);
  });

  it("fails closed when the administrator is not configured", () => {
    vi.stubEnv("ADMIN_GITHUB_ID", "");
    expect(isAllowedGithubProfile({ id: 123456 } as Profile)).toBe(false);
  });

  it("rejects a mutable login name instead of treating it as an ID", () => {
    vi.stubEnv("ADMIN_GITHUB_ID", "Mazon64");
    expect(() =>
      isAllowedGithubProfile({ id: "Mazon64" } as unknown as Profile),
    ).toThrow("ADMIN_GITHUB_ID must be a numeric GitHub user ID");
  });
});
