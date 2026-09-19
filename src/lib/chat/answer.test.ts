import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ generate: vi.fn(), portfolio: vi.fn(), catalog: vi.fn(), embed: vi.fn(), query: vi.fn(), countProjects: vi.fn(), countKnowledge: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/documents/gemini", () => ({ generateStructuredDocument: m.generate }));
vi.mock("@/lib/projects/ai", () => ({ embedTexts: m.embed }));
vi.mock("@/data/portfolio", () => ({ getPortfolioContent: m.portfolio }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ project: { findMany: m.catalog, count: m.countProjects }, projectKnowledge: { count: m.countKnowledge }, $queryRaw: m.query }) }));
import { generateChatAnswer, validateChatScope } from "./answer";
const catalog = ["alpha", "beta"].map((slug) => ({ slug, translations: [{ name: slug, summary: `${slug} project`, detailedInfo: `${slug} details` }] }));
const input = { conversationId: "00000000-0000-4000-8000-000000000001", requestId: "00000000-0000-4000-8000-000000000001", message: "What is David's experience?", locale: "en" as const, context: { path: "/en" as const, section: "projects" as const, projectSlug: "alpha" } };
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("PROJECT_RAG_ENABLED", "true");
  m.catalog.mockResolvedValue(catalog);
  m.portfolio.mockResolvedValue({ profile: { fullName: "David", title: "Engineer", longBio: "Public biography", email: null, socialLinks: [] }, experience: [{ company: "Public employer" }], education: [], skillCategories: [], projects: [] });
  m.embed.mockResolvedValue(["[1]"]); m.query.mockResolvedValue([]); m.countProjects.mockResolvedValue(1); m.countKnowledge.mockResolvedValue(1);
});
afterEach(() => vi.unstubAllEnvs());
describe("chat intent and browsing context", () => {
  it("does not force a personal question onto the project currently open", async () => {
    m.generate.mockResolvedValueOnce({ content: { kind: "person", projectSlugs: ["alpha"], usePageContext: true, clarification: "" } })
      .mockResolvedValueOnce({ content: { answer: "David has public professional experience.", sourceIds: ["person:experience"], insufficient: false } });
    const answer = await generateChatAnswer(input, []);
    expect(answer.scope).toMatchObject({ kind: "person", projectSlugs: [], usePageContext: false });
    expect(m.embed).not.toHaveBeenCalled(); expect(answer.sources[0].id).toBe("person:experience");
  });
  it("uses another explicitly requested project rather than the open project", () => {
    expect(validateChatScope({ kind: "projects", projectSlugs: ["beta"], usePageContext: true, clarification: "" }, catalog, "alpha"))
      .toMatchObject({ projectSlugs: ["beta"], usePageContext: false });
  });
  it("uses viewing context only when the resolved intent calls for it", () => {
    expect(validateChatScope({ kind: "projects", projectSlugs: [], usePageContext: true, clarification: "" }, catalog, "alpha").projectSlugs).toEqual(["alpha"]);
    expect(validateChatScope({ kind: "projects", projectSlugs: ["hidden"], usePageContext: false, clarification: "" }, catalog, "alpha").kind).toBe("clarify");
  });
  it("asks for clarification rather than retrieving sources when references are ambiguous", async () => {
    m.generate.mockResolvedValue({ content: { kind: "clarify", projectSlugs: [], usePageContext: false, clarification: "Do you mean alpha or beta?" } });
    expect((await generateChatAnswer({ ...input, message: "And how does that work?" }, [{ role: "ASSISTANT", content: "Earlier topic", topic: { kind: "projects", projectSlugs: ["beta"] } }])).answer).toBe("Do you mean alpha or beta?");
    expect(m.embed).not.toHaveBeenCalled(); expect(m.generate).toHaveBeenCalledOnce();
  });
  it("refuses invented source identifiers even in an otherwise valid answer", async () => {
    m.generate.mockResolvedValueOnce({ content: { kind: "person", projectSlugs: [], usePageContext: false, clarification: "" } })
      .mockResolvedValueOnce({ content: { answer: "Unsupported statement", sourceIds: ["private-document"], insufficient: false } });
    const answer = await generateChatAnswer(input, []);
    expect(answer.sources).toEqual([]); expect(answer.answer).not.toContain("Unsupported statement");
  });
});
