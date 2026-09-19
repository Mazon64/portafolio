import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { CHAT_COOKIE_SECONDS } from "./schemas";

export function newChatToken() { return randomBytes(32).toString("hex"); }
export function chatTokenHash(token: string | undefined): string | null {
  return token && /^[a-f0-9]{64}$/.test(token) ? createHash("sha256").update(token).digest("hex") : null;
}
export function chatCookieName() { return process.env.VERCEL_ENV === "production" ? "__Host-portfolio-chat" : "portfolio-chat"; }
export function chatCookieOptions(secure: boolean) {
  return { httpOnly: true, secure: secure || process.env.VERCEL_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: CHAT_COOKIE_SECONDS };
}
