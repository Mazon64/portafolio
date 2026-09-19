import "server-only";
import { createHmac } from "node:crypto";
import { serializable } from "@/lib/projects/sync";

export class ChatRateLimitError extends Error {}
export async function consumeChatQuota(identifier: string, operation: "session" | "message") {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Quota configuration unavailable");
  const now = Date.now();
  const minute = Math.floor(now / 60_000);
  const day = Math.floor(now / 86400_000);
  const hash = createHmac("sha256", secret).update(identifier).digest("hex");
  const limits = [
    { key: `chat:${operation}:client:${minute}:${hash}`, limit: operation === "session" ? 3 : 8, expiresAt: new Date((minute + 2) * 60_000) },
    { key: `chat:${operation}:minute:${minute}`, limit: 30, expiresAt: new Date((minute + 2) * 60_000) },
    { key: `chat:${operation}:day:${day}`, limit: operation === "session" ? 100 : 200, expiresAt: new Date((day + 1) * 86400_000) },
  ];
  await serializable(async (tx) => {
    for (const { key, limit, expiresAt } of limits) {
      const count = await tx.projectQueryQuota.upsert({ where: { key }, create: { key, expiresAt }, update: { count: { increment: 1 } }, select: { count: true } });
      if (count.count > limit) throw new ChatRateLimitError();
    }
  });
}
