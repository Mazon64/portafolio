import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookieGetMock, redirectMock } = vi.hoisted(() => ({
  cookieGetMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookieGetMock })),
  headers: vi.fn(async () => new Headers({ "accept-language": "en-US" })),
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import AuthErrorPage from "./page";

beforeEach(() => {
  cookieGetMock.mockReset();
  redirectMock.mockClear();
});

describe("authentication fallback", () => {
  it("returns a direct sign-in fallback to the localized CMS login", async () => {
    cookieGetMock.mockReturnValue({ value: "es" });

    await expect(AuthErrorPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "redirect:/admin/es/login",
    );
  });

  it("preserves a callback failure without exposing NextAuth's default page", async () => {
    await expect(
      AuthErrorPage({ searchParams: Promise.resolve({ error: "OAuthCallback" }) }),
    ).rejects.toThrow("redirect:/admin/en/login?error=failed");
  });
});
