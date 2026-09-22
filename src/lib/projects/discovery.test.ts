import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { discoverFiles, discoverImages, discoverProject, detectTechnologies, repositoryDemoUrl, type TreeFile } from "./discovery";
const repo = { id: 42, name: "repo", full_name: "owner/repo", default_branch: "main", private: false, description: "A project", homepage: "https://example.com", archived: false, topics: [] };
const file = (path: string, mode = "100644"): TreeFile => ({ path, mode, type: "blob", sha: "a".repeat(40), size: 100 });
afterEach(() => vi.unstubAllGlobals());
describe("automatic repository discovery", () => {
  it("supports repositories without GitHub Issues or documented milestones", async () => {
    const fetchMock = vi.fn(async (url: string) => url.includes("/git/trees/") ? Response.json({ tree: [], truncated: false }) : url.includes("/releases?") ? Response.json([]) : Response.json({}));
    vi.stubGlobal("fetch", fetchMock);
    const result = await discoverProject({ ...repo, has_issues: false }, "a".repeat(40));
    expect(result.chunks.map((chunk) => chunk.path)).toEqual(["GitHub metadata"]);
    expect(fetchMock.mock.calls.some(([url]) => url.includes("milestones"))).toBe(false);
  });
  it("groups images by purpose and ignores templates, symlinks and hidden paths", () => {
    const selection = discoverFiles([
      file("docs/portfolio/images/diagrams/data.png"), file("docs/portfolio/images/interface/home.webp"),
      file("docs/portfolio/images/features/login/cover.png"), file("docs/portfolio/images/features/secret.png", "120000"),
      file("public/legacy-diagram.svg"), file("public/next.svg"), file(".env.md"), file("docs/../secret.md"), file("README.md"),
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
  it("discovers ordinary documentation, implementation and tests without a portfolio manifest", () => {
    const result = discoverFiles([file("ROADMAP.md"), file("docs/usage.md"), file("src/main.ts"), file("tests/main.test.ts"),
      file("docs/portfolio/milestones.json"), file("src/generated/client.ts"), file("node_modules/lib/index.ts"), file("docs/link.md", "120000")]);
    expect(result.documents.map((item) => item.path)).toEqual(["ROADMAP.md", "docs/usage.md"]);
    expect(result.code.map((item) => item.path)).toEqual(["src/main.ts", "tests/main.test.ts"]);
    expect(Object.values(result).flat().some((item) => item.path.endsWith("milestones.json"))).toBe(false);
  });
  it("discovers local Markdown images without requiring special folders or fetching external images", () => {
    const images = discoverImages([file("assets/demo.png"), file("screenshots/home.webp"), file("assets/logo.png"), file("secret.png", "120000")],
      [{ path: "docs/usage.md", content: '![Demo](../assets/demo.png) ![Logo](../assets/logo.png) ![Remote](https://example.com/secret.png) <img src="../../secret.png">' }]);
    expect(images.map((item) => item.path)).toEqual(["assets/demo.png", "screenshots/home.webp"]);
  });
  it("discovers sources without any user-supplied paths", async () => {
    const files = [{ ...file("README.md"), sha: "a".repeat(40) }, { ...file("package.json"), sha: "b".repeat(40) }];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/git/trees/")) return Response.json({ tree: files, truncated: false });
      if (url.includes("/git/blobs/")) {
        const content = url.endsWith("b".repeat(40)) ? '{"dependencies":{"next":"16"}}' : "The project provides a documented application.";
        return Response.json({ encoding: "base64", size: content.length, content: Buffer.from(content).toString("base64") });
      }
      if (/\/(milestones|issues|releases)\?/.test(url)) return Response.json([]);
      return Response.json({ TypeScript: 100 });
    }));
    const result = await discoverProject(repo, "c".repeat(40));
    expect(result.metadata.techStack).toEqual(["Next.js", "TypeScript"]);
    expect(result.metadata.demoUrl).toBe("https://example.com/");
    expect(result.images).toEqual([]);
    expect(result.chunks.map((c) => c.path)).toContain("GitHub metadata");
  });
  it("does not silently accept a truncated repository tree", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ tree: [], truncated: true })));
    await expect(discoverProject(repo, "a".repeat(40))).rejects.toThrow("discovery budget");
  });
  it("imports ordinary GitHub activity as evidence rather than blindly copying closed states", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/git/trees/")) return Response.json({ tree: [], truncated: false });
      if (url.includes("/milestones?")) return Response.json([{ number: 2, title: "API", description: "Owner acceptance is pending.", state: "closed" }]);
      if (url.includes("/issues?")) return Response.json([{ number: 3, title: "Acceptance", body: "Deployment exists.\nOwner acceptance remains pending.", state: "closed", state_reason: "not_planned", html_url: "https://untrusted.example" }]);
      if (url.includes("/releases?")) return Response.json([{ id: 4, name: "Beta", tag_name: "v1", body: "Public beta for feedback.", draft: false, prerelease: true }]);
      return Response.json({});
    }));
    const result = await discoverProject(repo, "c".repeat(40));
    const issue = result.chunks.find((chunk) => chunk.path === "GitHub issue #3")!;
    expect(issue.sourceUrl).toBe("https://github.com/owner/repo/issues/3");
    expect(issue.content).toContain("Deployment exists.\nOwner acceptance remains pending.");
    expect(issue.content).toContain("not_planned");
    expect(result).not.toHaveProperty("milestones");
    expect(result.chunks.some((chunk) => chunk.path === "GitHub release #4")).toBe(true);
  });
  it("samples a long README without crowding out pending acceptance or reading a custom JSON file", async () => {
    const readme = "Implemented public API. ".repeat(1_000) + "Owner acceptance remains pending.";
    const guide = "The login feature requires owner acceptance before completion.";
    const files = [{ ...file("README.md"), size: readme.length }, { ...file("docs/chat.md"), sha: "b".repeat(40), size: guide.length }, file("docs/portfolio/milestones.json")];
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/git/trees/")) return Response.json({ tree: files, truncated: false });
      if (url.includes("/git/blobs/")) {
        const content = url.endsWith("b".repeat(40)) ? guide : readme;
        return Response.json({ encoding: "base64", size: content.length, content: Buffer.from(content).toString("base64") });
      }
      if (/\/(milestones|issues|releases)\?/.test(url)) return Response.json([]);
      return Response.json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await discoverProject(repo, "c".repeat(40));
    expect(result.chunks.filter((chunk) => chunk.path === "README.md")).toHaveLength(3);
    expect(result.chunks.some((chunk) => chunk.content.includes("Owner acceptance remains pending."))).toBe(true);
    expect(result.chunks.some((chunk) => chunk.path === "docs/chat.md")).toBe(true);
    expect(fetchMock.mock.calls.filter(([url]) => url.includes("/git/blobs/"))).toHaveLength(2);
  });
});
