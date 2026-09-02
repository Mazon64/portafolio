import type { Account } from "next-auth";
import type { GithubProfile } from "next-auth/providers/github";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { authOptions, isAllowedGithubAccount, isSessionWithinAbsoluteLifetime } from "./auth";

function githubAccount(id: string): Account {
  return {
    provider: "github",
    type: "oauth",
    providerAccountId: id,
  };
}

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
  it("requests no additional GitHub scopes and keeps only the numeric ID", async () => {
    const provider = authOptions.providers[0];
    if (typeof provider === "function") throw new Error("GitHub provider must be configured");

    expect(provider.authorization).toMatchObject({ params: { scope: "" } });
    expect(provider.userinfo).toBe("https://api.github.com/user");
    const profile = {
      id: 123456,
      login: "mutable-name",
      email: "private@example.com",
    } as GithubProfile;
    expect(await provider.profile?.(profile, {})).toEqual({ id: "123456" });
  });

  it("accepts only the configured numeric GitHub ID", () => {
    vi.stubEnv("ADMIN_GITHUB_ID", "123456");

    expect(isAllowedGithubAccount(githubAccount("123456"))).toBe(true);
    expect(isAllowedGithubAccount(githubAccount("654321"))).toBe(false);
    expect(isAllowedGithubAccount(null)).toBe(false);
    expect(
      isAllowedGithubAccount({ ...githubAccount("123456"), provider: "google" }),
    ).toBe(false);
  });

  it("fails closed when the administrator is not configured", () => {
    vi.stubEnv("ADMIN_GITHUB_ID", "");
    expect(isAllowedGithubAccount(githubAccount("123456"))).toBe(false);
  });

  it("rejects a mutable login name instead of treating it as an ID", () => {
    vi.stubEnv("ADMIN_GITHUB_ID", "Mazon64");
    expect(() => isAllowedGithubAccount(githubAccount("Mazon64"))).toThrow(
      "ADMIN_GITHUB_ID must be a numeric GitHub user ID",
    );
  });
});
