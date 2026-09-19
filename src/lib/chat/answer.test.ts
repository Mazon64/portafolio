import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ generate: vi.fn(), portfolio: vi.fn(), catalog: vi.fn(), embed: vi.fn(), query: vi.fn(), countProjects: vi.fn(), countKnowledge: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./provider", () => ({ requestChatFunctions: m.generate }));
vi.mock("@/lib/projects/ai", () => ({ embedTexts: m.embed }));
vi.mock("@/data/portfolio", () => ({ getPortfolioContent: m.portfolio }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ project: { findMany: m.catalog, count: m.countProjects }, projectKnowledge: { count: m.countKnowledge }, $queryRaw: m.query }) }));
import { generateChatAnswer } from "./answer";
const catalog = ["alpha", "beta"].map((slug) => ({ slug, status: "IN_PROGRESS", techStack: ["Next.js"], repositoryUrl: `https://github.com/owner/${slug}`, demoUrl: null, knowledge: [], translations: [{ name: slug, summary: `${slug} project`, detailedInfo: `${slug} details` }] }));
const input = { conversationId: "00000000-0000-4000-8000-000000000001", requestId: "00000000-0000-4000-8000-000000000001", message: "What is David's experience?", locale: "en" as const, context: { path: "/en" as const, section: "projects" as const, projectSlug: "alpha" } };
const calls = (...functions: Array<[string, unknown]>) => ({ role: "model", parts: functions.map(([name, args]) => ({ functionCall: { name, args } })) });
const final = (sourceIds: string[], actionIds: string[] = [], kind = "person", projectSlugs: string[] = []) => calls(["respond", { answer: "A grounded response.", sourceIds, actionIds, insufficient: false, scope: { kind, projectSlugs, usePageContext: false, clarification: "" } }]);
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("PROJECT_RAG_ENABLED", "true");
  m.catalog.mockResolvedValue(catalog);
  m.portfolio.mockResolvedValue({ profile: { fullName: "David", title: "Engineer", longBio: "Public biography", email: "public@example.test", contactText: "Contact me", socialLinks: [{ slug: "github", label: "GitHub", url: "https://github.com/owner" }, { slug: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/in/owner" }] }, experience: [{ company: "Public employer" }], education: [], skillCategories: [], projects: [] });
  m.embed.mockResolvedValue(["[1]"]); m.query.mockResolvedValue([]); m.countProjects.mockResolvedValue(1); m.countKnowledge.mockResolvedValue(1);
});
afterEach(() => vi.unstubAllEnvs());
describe("automatic public chat functions", () => {
  it("retrieves specific personal data despite an open project and answers without a topic-selection round", async () => {
    m.generate.mockResolvedValueOnce(calls(["get_public_profile", { section: "experience" }])).mockResolvedValueOnce(final(["person:experience"]));
    const answer = await generateChatAnswer(input, []);
    expect(answer.scope).toMatchObject({ kind: "person", projectSlugs: [], usePageContext: false });
    expect(m.embed).not.toHaveBeenCalled(); expect(answer.sources[0].id).toBe("person:experience");
    expect(JSON.stringify(m.generate.mock.calls[1][1])).toContain("Public employer");
    expect(m.generate).toHaveBeenCalledTimes(2);
  });
  it("resolves CV, a specific network and another project's repository in a single tool round", async () => {
    m.generate.mockResolvedValueOnce(calls(["get_cv", {}], ["get_social_links", { network: "LinkedIn" }], ["get_project", { slug: "beta" }]))
      .mockResolvedValueOnce(final(["project:beta"], ["action:cv", "social:linkedin", "repo:beta"], "projects", ["beta"]));
    const answer = await generateChatAnswer({ ...input, message: "Show your CV, LinkedIn and beta's repository." }, []);
    expect(answer.sources.filter((s) => s.action).map((s) => s.action)).toEqual(["cv", "social", "repository"]);
    expect(answer.sources.find((s) => s.id === "repo:beta")?.url).toBe("https://github.com/owner/beta");
    expect(answer.sources.some((s) => s.id === "social:github")).toBe(false);
    expect(answer.scope.projectSlugs).toEqual(["beta"]); expect(m.embed).not.toHaveBeenCalled();
  });
  it("rejects invented action identifiers rather than exposing model-supplied links", async () => {
    m.generate.mockResolvedValue(final([], ["https://evil.test"], "site"));
    await expect(generateChatAnswer(input, [])).rejects.toThrow("Unverified chat source");
  });
  it("does not execute arbitrary functions or retrieve hidden projects", async () => {
    m.generate.mockResolvedValueOnce(calls(["run_sql", { query: "SELECT private" }], ["search_project_sources", { query: "secret", projectSlugs: ["hidden"] }]))
      .mockResolvedValueOnce(final([], [], "out_of_scope"));
    await generateChatAnswer(input, []);
    expect(m.query).not.toHaveBeenCalled(); expect(m.embed).not.toHaveBeenCalled();
    expect(JSON.stringify(m.generate.mock.calls[1][1])).toContain("Unknown function");
  });
  it("withholds project actions if visibility changes during generation", async () => {
    m.generate.mockResolvedValueOnce(calls(["get_project", { slug: "beta" }])).mockResolvedValueOnce(final(["project:beta"], ["open:beta"], "projects", ["beta"]));
    m.countProjects.mockResolvedValue(0);
    await expect(generateChatAnswer(input, [])).rejects.toThrow("Public project changed");
  });
  it("revalidates retrieved corpus citations and preserves context for ambiguous follow-ups", async () => {
    m.query.mockResolvedValue([{ id: "chunk", path: "README.md", sourceUrl: "https://github.com/owner/beta/blob/commit/README.md", content: "Public evidence", projectSlug: "beta", knowledgeId: "corpus", distance: 0.1 }]);
    m.generate.mockResolvedValueOnce(calls(["search_project_sources", { query: "beta architecture", projectSlugs: ["beta"] }])).mockResolvedValueOnce(final(["chunk:chunk"], [], "projects", ["beta"]));
    const history = [{ role: "ASSISTANT", content: "Beta", topic: { kind: "projects", projectSlugs: ["beta"] } }];
    await generateChatAnswer(input, history);
    expect(m.countKnowledge).toHaveBeenCalled();
    expect(JSON.stringify(m.generate.mock.calls[0][1])).toContain("Beta");
  });
});
