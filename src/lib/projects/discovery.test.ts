import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { discoverFiles, discoverProject, detectTechnologies, parseRepositoryMilestones, repositoryDemoUrl, type TreeFile } from "./discovery";
const repo = { id: 42, name: "repo", full_name: "owner/repo", default_branch: "main", private: false, description: "A project", homepage: "https://example.com", archived: false, topics: [] };
const file = (path: string, mode = "100644"): TreeFile => ({ path, mode, type: "blob", sha: "a".repeat(40), size: 100 });
afterEach(() => vi.unstubAllGlobals());
describe("automatic repository discovery", () => {
  it("supports repositories without GitHub Issues or documented milestones", async () => {
    const fetchMock = vi.fn(async (url: string) => url.includes("/git/trees/") ? Response.json({ tree: [], truncated: false }) : Response.json({}));
    vi.stubGlobal("fetch", fetchMock);
    const result = await discoverProject({ ...repo, has_issues: false }, "a".repeat(40));
    expect(result.milestones).toEqual([]);
    expect(fetchMock.mock.calls.some(([url]) => url.includes("milestones"))).toBe(false);
  });
  it("groups images by purpose and ignores templates, symlinks and hidden paths", () => {
    const selection = discoverFiles([
      file("docs/portfolio/images/diagrams/data.png"), file("docs/portfolio/images/interface/home.webp"),
      file("docs/portfolio/images/features/login/cover.png"), file("docs/portfolio/images/features/secret.png", "120000"),
      file("public/project-media/portfolio-architecture.svg"), file("public/next.svg"), file(".env.md"), file("docs/../secret.md"), file("README.md"),
    ]);
    expect(selection.images.map((f) => f.path)).toEqual([
      "docs/portfolio/images/features/login/cover.png", "docs/portfolio/images/interface/home.webp", "docs/portfolio/images/diagrams/data.png",
    ]);
    expect(selection.documents.map((f) => f.path)).toEqual(["README.md"]);
  });
  it("detects technologies from manifests and deployment files without executing them", () => {
    expect(detectTechnologies([{ path: "package.json", content: JSON.stringify({ dependencies: { next: "16", react: "19", pg: "8" }, devDependencies: { typescript: "5" }, scripts: { install: "malicious-command" } }) }], ["Dockerfile", "vercel.json"], ["CSS"]))
      .toEqual(["Next.js", "React", "TypeScript", "PostgreSQL", "Docker", "Vercel", "CSS"]);
    expect(repositoryDemoUrl("javascript:alert(1)")).toBeNull();
  });
  it("requires milestone evidence present in the same repository snapshot", () => {
    const goal = { id: "cms", title: { es: "CMS", en: "CMS" }, weight: 10, completed: true, evidence: "docs/architecture.md" };
    expect(() => parseRepositoryMilestones([goal], repo, "a".repeat(40), new Set())).toThrow("evidence");
    const [milestone] = parseRepositoryMilestones([goal], repo, "a".repeat(40), new Set([goal.evidence]));
    expect(milestone.completed).toBe(true);
    expect(milestone.evidence).toContain(`/blob/${"a".repeat(40)}/docs/architecture.md`);
  });
  it("discovers sources without any user-supplied paths", async () => {
    const files = [{ ...file("README.md"), sha: "a".repeat(40) }, { ...file("package.json"), sha: "b".repeat(40) }];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/git/trees/")) return Response.json({ tree: files, truncated: false });
      if (url.includes("/git/blobs/")) {
        const content = url.endsWith("b".repeat(40)) ? '{"dependencies":{"next":"16"}}' : "The project provides a documented application.";
        return Response.json({ encoding: "base64", size: content.length, content: Buffer.from(content).toString("base64") });
      }
      if (url.includes("/milestones?")) return Response.json([]);
      return Response.json({ TypeScript: 100 });
    }));
    const result = await discoverProject(repo, "c".repeat(40));
    expect(result.metadata.techStack).toEqual(["Next.js", "TypeScript"]);
    expect(result.metadata.demoUrl).toBe("https://example.com/");
    expect(result.images).toEqual([]); expect(result.milestones).toEqual([]);
    expect(result.chunks.map((c) => c.path)).toContain("GitHub metadata");
  });
  it("does not silently accept a truncated repository tree", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ tree: [], truncated: true })));
    await expect(discoverProject(repo, "a".repeat(40))).rejects.toThrow("discovery budget");
  });
});
