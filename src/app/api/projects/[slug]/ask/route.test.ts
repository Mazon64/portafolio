import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { corpus, stillPublic, retrieve, embed, answer, quota } = vi.hoisted(() => ({ corpus: vi.fn(), stillPublic: vi.fn(), retrieve: vi.fn(), embed: vi.fn(), answer: vi.fn(), quota: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ projectKnowledge: { findFirst: corpus, count: stillPublic } }) }));
vi.mock("@/data/project-knowledge", () => ({ retrieveProjectSources: retrieve }));
vi.mock("@/lib/projects/ai", () => ({ embedTexts: embed, answerProjectQuestion: answer }));
vi.mock("@/lib/projects/quota", () => ({ consumeProjectQuestionQuota: quota, ProjectRateLimitError: class extends Error {} }));
import { POST } from "./route";
const context = { params: Promise.resolve({ slug: "portafolio" }) };
const request = () => new Request("https://example.test/api/projects/portafolio/ask", { method: "POST", headers: { origin: "https://example.test" }, body: JSON.stringify({ question: "How does this project work?", locale: "en" }) });
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("CMS_WRITES_ENABLED", "true"); vi.stubEnv("PROJECT_INTEGRATION_ENABLED", "true"); vi.stubEnv("PROJECT_RAG_ENABLED", "true"); vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("GEMINI_API_KEYS", "synthetic-key");
  corpus.mockResolvedValue({ id: "published" }); stillPublic.mockResolvedValue(1); embed.mockResolvedValue(["[1]"]); quota.mockResolvedValue(undefined);
  retrieve.mockResolvedValue([{ id: "source", knowledgeId: "published", content: "Grounded fact", path: "README.md", sourceUrl: "https://github.com/owner/repo/blob/commit/README.md", distance: 0.1 }]);
  answer.mockResolvedValue({ answer: "Grounded answer", sourceIds: ["source"], insufficient: false });
});
afterEach(() => vi.unstubAllEnvs());
describe("public project RAG", () => {
  it("blocks Preview before quota or provider calls", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect((await POST(request(), context)).status).toBe(503);
    expect(corpus).not.toHaveBeenCalled(); expect(embed).not.toHaveBeenCalled();
  });
  it("does not call providers for unpublished or hidden projects", async () => {
    corpus.mockResolvedValue(null);
    expect((await POST(request(), context)).status).toBe(404);
    expect(embed).not.toHaveBeenCalled(); expect(quota).not.toHaveBeenCalled();
  });
  it("returns only the cited public sources without raw excerpts", async () => {
    const response = await POST(request(), context);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const result = await response.json();
    expect(result.answer).toBe("Grounded answer");
    expect(result.sources).toEqual([{ id: "source", path: "README.md", url: "https://github.com/owner/repo/blob/commit/README.md" }]);
  });
  it("does not use sources from a corpus replaced during retrieval", async () => {
    retrieve.mockResolvedValue([{ id: "private", knowledgeId: "different", content: "Do not expose", distance: 0.1 }]);
    const result = await (await POST(request(), context)).json();
    expect(result.insufficient).toBe(true); expect(answer).not.toHaveBeenCalled();
  });
  it("withholds an answer if the corpus is withdrawn during generation", async () => {
    stillPublic.mockResolvedValue(0);
    expect((await POST(request(), context)).status).toBe(409);
  });
});
