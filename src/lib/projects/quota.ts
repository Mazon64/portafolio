import "server-only";
import { createHmac } from "node:crypto";
import { serializable } from "./sync";

export class ProjectRateLimitError extends Error {}

export async function consumeProjectQuestionQuota(identifier: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Quota configuration unavailable");
  const now = Date.now();
  const minute = Math.floor(now / 60_000);
  const day = Math.floor(now / 86400_000);
  const id = createHmac("sha256", secret).update(identifier).digest("hex");
  const limits = [
    { key: `project:client:${minute}:${id}`, limit: 3, expiresAt: new Date((minute + 2) * 60_000) },
    { key: `project:global:${minute}`, limit: 30, expiresAt: new Date((minute + 2) * 60_000) },
    { key: `project:day:${day}`, limit: 200, expiresAt: new Date((day + 1) * 86400_000) },
  ];
  await serializable(async (tx) => {
    for (const { key, limit, expiresAt } of limits) {
      const result = await tx.projectQueryQuota.upsert({ where: { key },
        create: { key, expiresAt }, update: { count: { increment: 1 } }, select: { count: true } });
      if (result.count > limit) throw new ProjectRateLimitError();
    }
  });
}
