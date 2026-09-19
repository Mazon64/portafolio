import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { serializable } from "@/lib/projects/sync";
import { chatEnabled } from "@/lib/chat/configuration";
import { CHAT_LEASE_MS, CHAT_RETENTION_MS, chatContextSchema, chatScopeSchema, chatSourceSchema, type ChatInput, type ChatScope, type ChatSessionDto, type ChatSource } from "@/lib/chat/schemas";

export class ChatStateError extends Error {
  constructor(readonly code: "expired" | "busy" | "conflict" | "invalid") { super(code); }
}
export type VisitorConversation = NonNullable<Awaited<ReturnType<typeof findVisitorConversation>>>;
export async function findVisitorConversation(tokenHash: string | null) {
  if (!tokenHash) return null;
  return getPrisma().chatConversation.findFirst({ where: { tokenHash, expiresAt: { gt: new Date() } } });
}
export async function createVisitorConversation(tokenHash: string, locale: "es" | "en", restart = false) {
  if (!chatEnabled()) throw new ChatStateError("expired");
  return serializable(async (tx) => {
    const previous = await tx.chatConversation.findUnique({ where: { tokenHash } });
    if (previous && previous.expiresAt.getTime() > Date.now() && !restart) return previous;
    if (previous) {
      // Keep the browser identifier stable across restarts: an older in-flight
      // response must not overwrite a new conversation's cookie with an old token.
      await tx.chatConversation.update({ where: { id: previous.id }, data: { tokenHash: `retired:${randomUUID()}`, expiresAt: new Date(), lockToken: null, lockUntil: null } });
      await tx.chatTurn.updateMany({ where: { conversationId: previous.id, status: "PENDING" }, data: { status: "FAILED", failureCode: "INTERRUPTED" } });
    }
    return tx.chatConversation.create({ data: { tokenHash, locale: locale === "es" ? "ES" : "EN", expiresAt: new Date(Date.now() + CHAT_RETENTION_MS) } });
  });
}
export function visibleMessageFilter(conversationPinned: boolean, now = new Date()): Prisma.ChatMessageWhereInput {
  return conversationPinned ? {} : { OR: [{ pinned: true }, { createdAt: { gt: new Date(now.getTime() - CHAT_RETENTION_MS) } }] };
}

export async function visitorHistory(conversation: VisitorConversation, before?: string): Promise<ChatSessionDto> {
  const visible = visibleMessageFilter(conversation.pinned);
  const cursor = before ? await getPrisma().chatTurn.findFirst({ where: { id: before, conversationId: conversation.id }, select: { updatedAt: true, id: true } }) : null;
  if (before && !cursor) throw new ChatStateError("invalid");
  const rows = await getPrisma().chatTurn.findMany({
    where: { conversationId: conversation.id, messages: { some: visible }, ...(cursor ? { OR: [
      { updatedAt: { lt: cursor.updatedAt } }, { updatedAt: cursor.updatedAt, id: { lt: cursor.id } },
    ] } : {}) },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 21,
    include: { messages: { where: visible, orderBy: [{ createdAt: "asc" }, { role: "desc" }] } },
  });
  const page = rows.slice(0, 20).reverse();
  return {
    enabled: true, conversation: { id: conversation.id, expiresAt: conversation.expiresAt.toISOString(), pinned: conversation.pinned },
    nextCursor: rows.length > 20 ? page[0].id : null,
    turns: page.map((turn) => ({
      id: turn.id, requestId: turn.requestId, locale: turn.locale === "ES" ? "es" : "en", createdAt: turn.createdAt.toISOString(),
      status: turn.status === "PENDING" && (!conversation.lockUntil || conversation.lockUntil.getTime() <= Date.now()) ? "FAILED" : turn.status,
      context: chatContextSchema.parse(turn.context), scope: turn.scope ? chatScopeSchema.parse(turn.scope) : null,
      messages: turn.messages.map((message) => ({ id: message.id, role: message.role as "USER" | "ASSISTANT", content: message.content,
        createdAt: message.createdAt.toISOString(), pinned: message.pinned, sources: chatSourceSchema.array().parse(message.sources) })),
    })),
  };
}

function sameInput(turn: { locale: string; context: Prisma.JsonValue; messages: Array<{ role: string; content: string }> }, input: ChatInput) {
  const context = chatContextSchema.parse(turn.context);
  return turn.locale === input.locale.toUpperCase() && context.path === input.context.path && context.section === input.context.section && context.projectSlug === input.context.projectSlug &&
    turn.messages.find((message) => message.role === "USER")?.content === input.message;
}

export async function inspectChatRequest(conversation: VisitorConversation, input: ChatInput) {
  if (input.conversationId !== conversation.id) throw new ChatStateError("conflict");
  const turn = await getPrisma().chatTurn.findUnique({ where: { conversationId_requestId: { conversationId: conversation.id, requestId: input.requestId } }, include: { messages: { where: visibleMessageFilter(conversation.pinned) } } });
  if (!turn) return null;
  if (!sameInput(turn, input)) throw new ChatStateError("conflict");
  if (turn.status === "COMPLETE") return "complete";
  if (turn.status === "PENDING" && conversation.lockUntil && conversation.lockUntil.getTime() > Date.now()) return "pending";
  return null;
}

export async function beginChatTurn(conversation: VisitorConversation, input: ChatInput) {
  if (!chatEnabled()) throw new ChatStateError("expired");
  if (input.conversationId !== conversation.id) throw new ChatStateError("conflict");
  return serializable(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM "ChatConversation"
      WHERE id = ${conversation.id}::uuid AND "tokenHash" = ${conversation.tokenHash} AND "expiresAt" > now() FOR UPDATE`);
    if (!locked.length) throw new ChatStateError("expired");
    const current = await tx.chatConversation.findUniqueOrThrow({ where: { id: conversation.id } });
    const existing = await tx.chatTurn.findUnique({ where: { conversationId_requestId: { conversationId: conversation.id, requestId: input.requestId } }, include: { messages: { where: visibleMessageFilter(current.pinned) } } });
    if (existing && !sameInput(existing, input)) throw new ChatStateError("conflict");
    if (existing?.status === "COMPLETE") return { kind: "complete" as const };
    if (current.lockUntil && current.lockUntil.getTime() > Date.now()) {
      if (existing?.status === "PENDING") return { kind: "pending" as const };
      throw new ChatStateError("busy");
    }
    const lockToken = randomUUID();
    await tx.chatTurn.updateMany({ where: { conversationId: current.id, status: "PENDING" }, data: { status: "FAILED", failureCode: "INTERRUPTED" } });
    await tx.chatConversation.update({ where: { id: current.id }, data: {
      lockToken, lockUntil: new Date(Date.now() + CHAT_LEASE_MS), expiresAt: new Date(Date.now() + CHAT_RETENTION_MS),
      lastActivityAt: new Date(), locale: input.locale === "es" ? "ES" : "EN",
    } });
    const turn = existing ? await tx.chatTurn.update({ where: { id: existing.id }, data: { status: "PENDING", failureCode: null } })
      : await tx.chatTurn.create({ data: {
        conversationId: current.id, requestId: input.requestId, locale: input.locale === "es" ? "ES" : "EN", context: input.context,
        messages: { create: { role: "USER", content: input.message } },
      } });
    return { kind: "claimed" as const, turnId: turn.id, conversationId: current.id, lockToken };
  });
}

export async function recentChatHistory(conversation: VisitorConversation, excludeTurnId: string) {
  const turns = await getPrisma().chatTurn.findMany({ where: { conversationId: conversation.id, id: { not: excludeTurnId }, status: "COMPLETE" }, orderBy: { updatedAt: "desc" }, take: 6,
    include: { messages: { where: visibleMessageFilter(conversation.pinned), orderBy: [{ createdAt: "asc" }, { role: "desc" }] } },
  });
  return turns.reverse().flatMap((turn) => {
    const scope = chatScopeSchema.safeParse(turn.scope);
    return turn.messages.map((message) => ({ role: message.role, content: message.content.slice(0, 2000),
      topic: scope.success ? { kind: scope.data.kind, projectSlugs: scope.data.projectSlugs } : undefined,
    }));
  });
}

export async function finishChatTurn(claim: { turnId: string; conversationId: string; lockToken: string }, answer: string, sources: ChatSource[], scope: ChatScope) {
  if (!chatEnabled()) throw new ChatStateError("expired");
  return serializable(async (tx) => {
    const owned = await tx.chatConversation.updateMany({ where: { id: claim.conversationId, lockToken: claim.lockToken, lockUntil: { gt: new Date() }, expiresAt: { gt: new Date() } },
      data: { lockToken: null, lockUntil: null, lastActivityAt: new Date(), expiresAt: new Date(Date.now() + CHAT_RETENTION_MS) } });
    if (!owned.count) throw new ChatStateError("conflict");
    await tx.chatMessage.create({ data: { turnId: claim.turnId, role: "ASSISTANT", content: answer, sources } });
    await tx.chatTurn.update({ where: { id: claim.turnId }, data: { status: "COMPLETE", scope: { ...scope, clarification: "" }, failureCode: null } });
  });
}

export async function failChatTurn(claim: { turnId: string; conversationId: string; lockToken: string }, code: string) {
  if (!chatEnabled()) return;
  await serializable(async (tx) => {
    const owned = await tx.chatConversation.updateMany({ where: { id: claim.conversationId, lockToken: claim.lockToken }, data: { lockToken: null, lockUntil: null } });
    if (owned.count) await tx.chatTurn.updateMany({ where: { id: claim.turnId, status: "PENDING" }, data: { status: "FAILED", failureCode: code.slice(0, 180) } });
  });
}
