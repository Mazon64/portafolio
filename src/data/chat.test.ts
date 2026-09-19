import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ find: vi.fn(), history: vi.fn(), turn: vi.fn(), transaction: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ chatConversation: { findFirst: m.find }, chatTurn: { findUnique: m.turn, findMany: m.history } }) }));
vi.mock("@/lib/projects/sync", () => ({ serializable: m.transaction }));
import { beginChatTurn, findVisitorConversation, inspectChatRequest, visibleMessageFilter } from "./chat";
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());
describe("visitor conversation isolation", () => {
  it("persists the user message before generation and creates a lease", async () => {
    vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("CMS_WRITES_ENABLED", "true"); vi.stubEnv("CHAT_ENABLED", "true"); vi.stubEnv("GEMINI_API_KEYS", "synthetic-key");
    const context = { path: "/en" as const, section: "about" as const, projectSlug: null };
    const conversation = { id: "conversation", tokenHash: "own-hash", pinned: false, lockUntil: null } as NonNullable<Awaited<ReturnType<typeof findVisitorConversation>>>;
    const create = vi.fn().mockResolvedValue({ id: "turn" });
    const update = vi.fn();
    m.transaction.mockImplementation(async (callback) => callback({
      $queryRaw: vi.fn().mockResolvedValue([{ id: conversation.id }]), chatConversation: { findUniqueOrThrow: vi.fn().mockResolvedValue(conversation), update },
      chatTurn: { findUnique: vi.fn().mockResolvedValue(null), updateMany: vi.fn(), create },
    }));
    const result = await beginChatTurn(conversation, { conversationId: "conversation", requestId: "request", message: "Question", locale: "en", context });
    expect(result).toMatchObject({ kind: "claimed", turnId: "turn", conversationId: "conversation" });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ messages: { create: { role: "USER", content: "Question" } } }) });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lockToken: expect.any(String), lockUntil: expect.any(Date) }) }));
    vi.unstubAllEnvs();
  });
  it("does not query conversations without a valid cookie hash", async () => {
    expect(await findVisitorConversation(null)).toBeNull(); expect(m.find).not.toHaveBeenCalled();
    await findVisitorConversation("hashed-token");
    expect(m.find).toHaveBeenCalledWith({ where: { tokenHash: "hashed-token", expiresAt: { gt: expect.any(Date) } } });
  });
  it("rejects reusing a request ID for different content", async () => {
    const context = { path: "/en" as const, section: "about" as const, projectSlug: null };
    m.turn.mockResolvedValue({ locale: "EN", context, status: "COMPLETE", messages: [{ role: "USER", content: "Original question" }] });
    const conversation = { id: "conversation", pinned: false } as NonNullable<Awaited<ReturnType<typeof findVisitorConversation>>>;
    await expect(inspectChatRequest(conversation, { conversationId: "conversation", requestId: "request", locale: "en", context, message: "Different question" })).rejects.toMatchObject({ code: "conflict" });
  });
  it("hides expired messages immediately without waiting for scheduled deletion", () => {
    expect(visibleMessageFilter(false, new Date("2026-09-20T12:00:00Z"))).toEqual({ OR: [{ pinned: true }, { createdAt: { gt: new Date("2026-09-17T12:00:00Z") } }] });
    expect(visibleMessageFilter(true)).toEqual({});
  });
});
