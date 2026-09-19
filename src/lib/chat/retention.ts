import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { isCmsWriteEnabled } from "@/config/env";
import { serializable } from "@/lib/projects/sync";
import { CHAT_RETENTION_MS } from "./schemas";

export async function pruneConversationMessages(tx: Prisma.TransactionClient, conversationId: string, now = new Date()) {
  const cutoff = new Date(now.getTime() - CHAT_RETENTION_MS);
  return tx.$executeRaw(Prisma.sql`DELETE FROM "ChatMessage" m USING "ChatTurn" t, "ChatConversation" c
    WHERE m."turnId" = t.id AND t."conversationId" = c.id AND c.id = ${conversationId}::uuid
    AND m."createdAt" <= ${cutoff} AND NOT m.pinned AND NOT c.pinned`);
}

export async function cleanupChat(now = new Date()) {
  if (!isCmsWriteEnabled()) return { conversations: 0, messages: 0 };
  return serializable(async (tx) => {
    const cutoff = new Date(now.getTime() - CHAT_RETENTION_MS);
    // Pinning takes the same conversation lock, preventing races with expiration.
    const conversations = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT c.id FROM "ChatConversation" c WHERE NOT c.pinned AND (
        (c."expiresAt" <= ${now} AND NOT EXISTS (
          SELECT 1 FROM "ChatTurn" t JOIN "ChatMessage" m ON m."turnId" = t.id WHERE t."conversationId" = c.id
        )) OR EXISTS (
          SELECT 1 FROM "ChatTurn" t JOIN "ChatMessage" m ON m."turnId" = t.id
          WHERE t."conversationId" = c.id AND NOT m.pinned AND m."createdAt" <= ${cutoff}
        )) ORDER BY c."lastActivityAt" ASC LIMIT 100 FOR UPDATE SKIP LOCKED`);
    const ids = conversations.map((c) => c.id);
    const messages = ids.length ? await tx.$executeRaw(Prisma.sql`DELETE FROM "ChatMessage" m USING "ChatTurn" t, "ChatConversation" c
      WHERE m."turnId" = t.id AND t."conversationId" = c.id AND c.id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
      AND m."createdAt" <= ${cutoff} AND NOT m.pinned AND NOT c.pinned`) : 0;
    await tx.chatTurn.deleteMany({ where: { conversationId: { in: ids }, messages: { none: {} } } });
    const removed = await tx.chatConversation.deleteMany({ where: { id: { in: ids }, pinned: false, expiresAt: { lte: now }, turns: { none: {} } } });
    await tx.projectQueryQuota.deleteMany({ where: { expiresAt: { lte: now } } });
    return { conversations: removed.count, messages };
  });
}
