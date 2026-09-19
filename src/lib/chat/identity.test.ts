import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { chatCookieName, chatCookieOptions, chatTokenHash, newChatToken } from "./identity";
afterEach(() => vi.unstubAllEnvs());
describe("chat identity boundary", () => {
  it("uses an opaque unpredictable cookie and stores only its hash", () => {
    const token = newChatToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(chatTokenHash(token)).not.toBe(token);
    expect(chatTokenHash(token)).toBe(chatTokenHash(token));
    expect(chatTokenHash("visitor-id")).toBeNull();
  });
  it("uses a host-only secure HttpOnly cookie lasting three days in Production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(chatCookieName()).toBe("__Host-portfolio-chat");
    expect(chatCookieOptions(false)).toEqual({ httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 259200 });
  });
});
