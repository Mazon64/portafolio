import { afterEach, describe, expect, it, vi } from "vitest";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: authMock }));

import {
  getAdminIdentity,
  requireAdmin,
  UnauthorizedError,
} from "./authorization";

afterEach(() => {
  authMock.mockReset();
  vi.unstubAllEnvs();
});

describe("administrator authorization", () => {
  it("returns a narrow identity for the configured GitHub user", async () => {
    vi.stubEnv("ADMIN_GITHUB_ID", "123456");
    authMock.mockResolvedValue({
      user: {
        githubId: "123456",
        name: "Ada",
        email: "ada@example.com",
        image: "https://example.com/ada.png",
      },
    });

    await expect(getAdminIdentity()).resolves.toEqual({
      name: "Ada",
      email: "ada@example.com",
      image: "https://example.com/ada.png",
    });
  });

  it("rejects a stale session after the whitelist changes", async () => {
    vi.stubEnv("ADMIN_GITHUB_ID", "999999");
    authMock.mockResolvedValue({ user: { githubId: "123456" } });

    await expect(getAdminIdentity()).resolves.toBeNull();
    await expect(requireAdmin()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects a missing session", async () => {
    vi.stubEnv("ADMIN_GITHUB_ID", "123456");
    authMock.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
