import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), lock: vi.fn(), conversation: vi.fn(), message: vi.fn(), updateMessage: vi.fn(), updateConversation: vi.fn(), prune: vi.fn(), transaction: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin: m.auth }));
vi.mock("@/lib/projects/sync", () => ({ serializable: m.transaction }));
vi.mock("@/lib/chat/retention", () => ({ pruneConversationMessages: m.prune }));
import { mutateAdminConversation } from "./conversations";
const date = "2026-09-20T00:00:00.000Z";
const input = { conversationId: "conversation", id: "conversation", updatedAt: date, operation: "pin-conversation" as const, pinned: true };
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("CMS_WRITES_ENABLED", "true"); vi.stubEnv("VERCEL_ENV", "production"); m.auth.mockResolvedValue({ githubId: "owner" });
  m.lock.mockResolvedValue([{ id: "conversation" }]); m.conversation.mockResolvedValue({ id: "conversation", updatedAt: new Date(date), pinned: false });
  m.transaction.mockImplementation(async (callback) => callback({ $queryRaw: m.lock,
    chatConversation: { findUniqueOrThrow: m.conversation, update: m.updateConversation }, chatMessage: { findFirst: m.message, update: m.updateMessage },
  }));
});
afterEach(() => vi.unstubAllEnvs());
describe("conversation retention controls", () => {
  it("blocks administrative changes in Preview", async () => {
    vi.stubEnv("VERCEL_ENV", "preview"); expect(await mutateAdminConversation(input)).toBe(false); expect(m.transaction).not.toHaveBeenCalled();
  });
  it("checks the conversation timestamp before pinning", async () => {
    expect(await mutateAdminConversation({ ...input, updatedAt: "2020-01-01T00:00:00.000Z" })).toBe(false);
    expect(m.updateConversation).not.toHaveBeenCalled();
  });
  it("prunes expired messages before pinning so they cannot be revived", async () => {
    expect(await mutateAdminConversation(input)).toBe(true);
    expect(m.prune).toHaveBeenCalledTimes(2);
    expect(m.prune.mock.invocationCallOrder[0]).toBeLessThan(m.updateConversation.mock.invocationCallOrder[0]);
  });
  it("does not pin an expired or foreign message", async () => {
    m.message.mockResolvedValue(null);
    expect(await mutateAdminConversation({ ...input, id: "other-message", operation: "pin-message" })).toBe(false);
    expect(m.message).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ turn: { conversationId: "conversation" } }) }));
    expect(m.updateMessage).not.toHaveBeenCalled();
  });
});
