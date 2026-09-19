import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/authorization";
import { isCmsWriteEnabled } from "@/config/env";
import { serializable } from "@/lib/projects/sync";
import { pruneConversationMessages } from "@/lib/chat/retention";
import { CHAT_RETENTION_MS, chatContextSchema, chatScopeSchema, chatSourceSchema } from "@/lib/chat/schemas";

const visibleMessages = (): Prisma.ChatMessageWhereInput => ({ OR: [
  { pinned: true }, { createdAt: { gt: new Date(Date.now() - CHAT_RETENTION_MS) } }, { turn: { conversation: { pinned: true } } },
] });

export async function getAdminConversations(page = 1, query = "", pinned = false) {
  await requireAdmin();
  const where: Prisma.ChatConversationWhereInput = {
    ...(pinned ? { OR: [{ pinned: true }, { turns: { some: { messages: { some: { pinned: true } } } } }] } : {}),
    turns: { some: { messages: { some: { AND: [visibleMessages(), ...(query ? [{ content: { contains: query, mode: "insensitive" as const } }] : [])] } } } },
  };
  const total = await getPrisma().chatConversation.count({ where });
  const pages = Math.max(1, Math.ceil(total / 20));
  const currentPage = Math.min(Math.max(page, 1), pages);
  const conversations = await getPrisma().chatConversation.findMany({ where, take: 20, skip: (currentPage - 1) * 20,
    orderBy: [{ pinned: "desc" }, { lastActivityAt: "desc" }],
    select: { id: true, locale: true, pinned: true, updatedAt: true, lastActivityAt: true, lockUntil: true,
      _count: { select: { turns: { where: { messages: { some: { pinned: true } } } } } },
      turns: { where: { messages: { some: visibleMessages() } }, take: 1, orderBy: { updatedAt: "desc" },
        select: { status: true, messages: { where: visibleMessages(), take: 1, orderBy: { createdAt: "asc" }, select: { content: true } } } },
    },
  });
  return { page: currentPage, pages, total, conversations: conversations.map((c) => ({ id: c.id, locale: c.locale, pinned: c.pinned,
    hasPinnedMessages: c._count.turns > 0,
    status: c.turns[0]?.status === "PENDING" && (!c.lockUntil || c.lockUntil.getTime() <= Date.now()) ? "FAILED" : c.turns[0]?.status ?? "COMPLETE",
    updatedAt: c.updatedAt.toISOString(), lastActivityAt: c.lastActivityAt.toISOString(), preview: c.turns[0]?.messages[0]?.content.slice(0, 180) ?? "" })) };
}

export async function getAdminConversation(id: string, requestedPage = 1) {
  await requireAdmin();
  const conversation = await getPrisma().chatConversation.findUnique({ where: { id }, select: { id: true, pinned: true, locale: true, createdAt: true, lastActivityAt: true, updatedAt: true, lockUntil: true } });
  if (!conversation) return null;
  const where: Prisma.ChatTurnWhereInput = { conversationId: id, messages: { some: visibleMessages() } };
  const total = await getPrisma().chatTurn.count({ where });
  const pages = Math.max(1, Math.ceil(total / 30));
  const page = Math.min(Math.max(requestedPage, 1), pages);
  const turns = await getPrisma().chatTurn.findMany({ where, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], skip: (page - 1) * 30, take: 30,
    include: { messages: { where: visibleMessages(), orderBy: [{ createdAt: "asc" }, { role: "desc" }] } },
  });
  return { ...conversation, lockUntil: conversation.lockUntil?.toISOString() ?? null, createdAt: conversation.createdAt.toISOString(), updatedAt: conversation.updatedAt.toISOString(), lastActivityAt: conversation.lastActivityAt.toISOString(), page, pages,
    turns: turns.reverse().map((turn) => ({ id: turn.id, status: turn.status === "PENDING" && (!conversation.lockUntil || conversation.lockUntil.getTime() <= Date.now()) ? "FAILED" : turn.status, failureCode: turn.failureCode,
      context: chatContextSchema.parse(turn.context), scope: turn.scope ? chatScopeSchema.parse(turn.scope) : null,
      messages: turn.messages.map((m) => ({ id: m.id, role: m.role, content: m.content, pinned: m.pinned, createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString(), sources: chatSourceSchema.array().parse(m.sources) })),
    })),
  };
}

export async function mutateAdminConversation(input: { conversationId: string; id: string; updatedAt: string; operation: "pin-conversation" | "pin-message" | "delete"; pinned: boolean }) {
  await requireAdmin();
  if (!isCmsWriteEnabled()) return false;
  return serializable(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM "ChatConversation" WHERE id = ${input.conversationId}::uuid FOR UPDATE`);
    if (!locked.length) return false;
    const conversation = await tx.chatConversation.findUniqueOrThrow({ where: { id: input.conversationId } });
    if (input.operation === "pin-message") {
      const message = await tx.chatMessage.findFirst({ where: { id: input.id, updatedAt: new Date(input.updatedAt), turn: { conversationId: conversation.id }, AND: [visibleMessages()] } });
      if (!message) return false;
      await tx.chatMessage.update({ where: { id: message.id }, data: { pinned: input.pinned } });
      await pruneConversationMessages(tx, conversation.id);
      return true;
    }
    if (conversation.id !== input.id || conversation.updatedAt.toISOString() !== input.updatedAt) return false;
    if (input.operation === "delete") {
      await tx.chatConversation.delete({ where: { id: conversation.id } });
      return true;
    }
    // Never revive already expired messages by pinning their conversation later.
    await pruneConversationMessages(tx, conversation.id);
    await tx.chatConversation.update({ where: { id: conversation.id }, data: { pinned: input.pinned } });
    await pruneConversationMessages(tx, conversation.id);
    return true;
  });
}
