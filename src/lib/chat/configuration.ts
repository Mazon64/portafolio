import "server-only";
import { isCmsWriteEnabled } from "@/config/env";

export function chatEnabled() {
  return isCmsWriteEnabled() && process.env.CHAT_ENABLED?.trim() === "true" && Boolean(process.env.GEMINI_API_KEYS?.trim());
}
