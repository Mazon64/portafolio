import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ cookie: vi.fn(), find: vi.fn(), create: vi.fn(), history: vi.fn(), quota: vi.fn(), inspect: vi.fn(), begin: vi.fn(), recent: vi.fn(), generate: vi.fn(), finish: vi.fn(), fail: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: m.cookie }) }));
vi.mock("@/data/chat", () => ({
  findVisitorConversation: m.find, createVisitorConversation: m.create, visitorHistory: m.history,
  inspectChatRequest: m.inspect, beginChatTurn: m.begin, recentChatHistory: m.recent, finishChatTurn: m.finish, failChatTurn: m.fail,
  ChatStateError: class extends Error { constructor(readonly code: string) { super(code); } },
}));
vi.mock("@/lib/chat/quota", () => ({ consumeChatQuota: m.quota, ChatRateLimitError: class extends Error {} }));
vi.mock("@/lib/chat/answer", () => ({ generateChatAnswer: m.generate }));
vi.mock("@/lib/projects/ai", () => ({ projectAiFailureCode: () => "PROVIDER_UNAVAILABLE" }));
import { GET, POST } from "./route";
import { POST as sendMessage } from "../messages/route";
import { chatTokenHash } from "@/lib/chat/identity";
const id = "00000000-0000-4000-8000-000000000001";
const conversation = { id, pinned: false, expiresAt: new Date(Date.now() + 86400_000) };
const snapshot = { enabled: true, conversation: { id, pinned: false, expiresAt: conversation.expiresAt.toISOString() }, turns: [], nextCursor: null };
const request = (body: unknown, path = "session") => new Request(`https://example.test/api/chat/${path}`, { method: "POST", headers: { origin: "https://example.test", "content-type": "application/json" }, body: JSON.stringify(body) });
const input = { conversationId: id, requestId: id, message: "What is David's experience?", locale: "en", context: { path: "/en", section: "projects", projectSlug: "portfolio" } };
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("CMS_WRITES_ENABLED", "true"); vi.stubEnv("CHAT_ENABLED", "true"); vi.stubEnv("GEMINI_API_KEYS", "synthetic-key");
  m.find.mockImplementation(async (hash) => hash ? conversation : null); m.create.mockResolvedValue(conversation); m.history.mockResolvedValue(snapshot);
  m.cookie.mockReturnValue({ value: "a".repeat(64) }); m.inspect.mockResolvedValue(null); m.begin.mockResolvedValue({ kind: "claimed", turnId: id, conversationId: id, lockToken: id });
  m.recent.mockResolvedValue([]); m.generate.mockResolvedValue({ answer: "A grounded answer.", sources: [], scope: { kind: "person", projectSlugs: [], usePageContext: false, clarification: "" } });
});
afterEach(() => vi.unstubAllEnvs());
describe("chat API and cookie consent", () => {
  it("does not create a conversation or cookie when opening chat without an identifier", async () => {
    m.cookie.mockReturnValue(undefined);
    const response = await GET(new Request("https://example.test/api/chat/session"));
    expect(await response.json()).toMatchObject({ enabled: true, conversation: null });
    expect(response.headers.get("set-cookie")).toBeNull(); expect(m.create).not.toHaveBeenCalled();
  });
  it("requires affirmative start before issuing the functional cookie", async () => {
    m.cookie.mockReturnValue(undefined);
    expect((await POST(request({ accepted: false, locale: "es" }))).status).toBe(400);
    expect(m.create).not.toHaveBeenCalled();
    const response = await POST(request({ accepted: true, locale: "es" }));
    expect(response.status).toBe(200); expect(m.create).toHaveBeenCalledOnce();
    const cookie = response.headers.get("set-cookie")!;
    expect(cookie).toContain("__Host-portfolio-chat="); expect(cookie).toContain("HttpOnly"); expect(cookie).toContain("Secure"); expect(cookie.toLowerCase()).toContain("samesite=lax");
    expect(JSON.stringify(await response.json())).not.toContain("tokenHash");
  });
  it("resumes a valid cookie without creating a new conversation", async () => {
    const response = await POST(request({ accepted: true, locale: "es" }));
    expect(response.status).toBe(200); expect(m.create).not.toHaveBeenCalled();
    expect(m.history).toHaveBeenCalledWith(conversation);
  });
  it("blocks Preview before writes and provider calls", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect((await POST(request({ accepted: true, locale: "es" }))).status).toBe(503);
    expect((await sendMessage(request(input, "messages"))).status).toBe(503);
    expect(m.find).not.toHaveBeenCalled(); expect(m.create).not.toHaveBeenCalled(); expect(m.generate).not.toHaveBeenCalled();
  });
  it("keeps the authorized browser token when starting a new conversation", async () => {
    const token = "a".repeat(64);
    const response = await POST(request({ accepted: true, locale: "en", restart: true }));
    expect(response.status).toBe(200);
    expect(m.find).toHaveBeenCalledWith(chatTokenHash(token));
    expect(m.create).toHaveBeenCalledWith(chatTokenHash(token), "en", true);
    expect(response.headers.get("set-cookie")).toContain(`__Host-portfolio-chat=${token};`);
  });
  it.each([false, true])("replaces an expired browser token (restart=%s)", async (restart) => {
    m.find.mockResolvedValue(null);
    const response = await POST(request({ accepted: true, locale: "en", restart }));
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie")!;
    const token = /__Host-portfolio-chat=([a-f0-9]{64});/.exec(cookie)?.[1];
    expect(token).toBeDefined();
    expect(token).not.toBe("a".repeat(64));
    expect(m.create).toHaveBeenCalledWith(chatTokenHash(token), "en", restart);
  });
  it("cannot authorize a supplied conversation ID without the cookie", async () => {
    m.cookie.mockReturnValue(undefined);
    expect((await sendMessage(request({ ...input, conversationId: id }, "messages"))).status).toBe(401);
    expect(m.begin).not.toHaveBeenCalled();
  });
  it("rejects a stale conversation reference from another tab before generation", async () => {
    expect((await sendMessage(request({ ...input, conversationId: "00000000-0000-4000-8000-000000000002" }, "messages"))).status).toBe(409);
    expect(m.begin).not.toHaveBeenCalled(); expect(m.generate).not.toHaveBeenCalled();
  });
  it("does not regenerate a completed request on network retry", async () => {
    m.inspect.mockResolvedValue("complete");
    expect((await sendMessage(request(input, "messages"))).status).toBe(200);
    expect(m.quota).not.toHaveBeenCalled(); expect(m.generate).not.toHaveBeenCalled();
  });
  it("keeps a saved user message and releases its claim when the provider fails", async () => {
    m.generate.mockRejectedValue(new Error("Synthetic provider failure"));
    const response = await sendMessage(request(input, "messages"));
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ status: "unavailable", saved: true });
    expect(m.fail).toHaveBeenCalledWith(expect.objectContaining({ turnId: id }), "PROVIDER_UNAVAILABLE");
    expect(m.finish).not.toHaveBeenCalled();
  });
  it("rejects cross-origin message requests", async () => {
    const req = request(input, "messages"); req.headers.set("origin", "https://other.test");
    expect((await sendMessage(req)).status).toBe(403); expect(m.find).not.toHaveBeenCalled();
  });
});
