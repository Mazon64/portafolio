import { afterEach, describe, expect, it, vi } from "vitest";
const findMany = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ project: { findMany } }) }));
import { getPublicProjectExtras } from "./project-knowledge";

const text = { summary: "A published project summary.", problem: "A published problem.", solution: "A published solution.", architecture: "A published architecture.", decisions: "Published decisions.", results: "Published results." };
const published = [{ id: "published", title: { es: "Publicado", en: "Published" }, weight: 1, completed: true, evidence: "" }];
function row(repositoryFullName: string) {
  return { slug: "portfolio", integration: { enabled: true }, knowledge: [{ id: "corpus", chunks: [], narrative: {
    automatic: true, names: { es: "Proyecto", en: "Project" }, es: text, en: text, assets: [], milestones: published,
    metadata: { repositoryId: "1", repositoryFullName, branch: "main", demoUrl: null, techStack: [], status: "COMPLETED", sourcePaths: [] },
  } }] };
}
afterEach(() => { vi.unstubAllEnvs(); findMany.mockReset(); });
describe("candidate portfolio milestones", () => {
  it("shows the candidate roadmap in Preview with commit-pinned evidence", async () => {
    vi.stubEnv("VERCEL_ENV", "preview"); vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "a".repeat(40));
    findMany.mockResolvedValue([row("Mazon64/portafolio")]);
    const { portfolio } = await getPublicProjectExtras(["portfolio"]);
    expect(portfolio.milestonePreview).toBe(true);
    expect(portfolio.progressPct).toBe(70);
    expect(portfolio.milestones.filter((item) => !item.completed)).toHaveLength(3);
    expect(portfolio.milestones.every((item) => item.evidence.startsWith(`https://github.com/Mazon64/portafolio/blob/${"a".repeat(40)}/`))).toBe(true);
  });
  it.each([["production", "Mazon64/portafolio"], ["preview", "another/project"]])("keeps published milestones for %s / %s", async (environment, repository) => {
    vi.stubEnv("VERCEL_ENV", environment); findMany.mockResolvedValue([row(repository)]);
    const { portfolio } = await getPublicProjectExtras(["portfolio"]);
    expect(portfolio.milestonePreview).toBe(false);
    expect(portfolio.milestones).toEqual(published);
    expect(portfolio.progressPct).toBe(100);
  });
});
