import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), config: vi.fn(), createConfig: vi.fn(), findProject: vi.fn(), findSlug: vi.fn(), createProject: vi.fn(), repository: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin: m.auth }));
vi.mock("@/lib/projects/github", () => ({ getRepository: m.repository }));
vi.mock("@/lib/prisma", () => ({ getPrisma: vi.fn() }));
vi.mock("@/lib/projects/sync", () => ({ serializable: async (fn: (tx: unknown) => unknown) => fn({
  projectIntegration: { findUnique: m.config, create: m.createConfig },
  project: { findFirst: m.findProject, findUnique: m.findSlug, create: m.createProject },
}) }));
import { connectProjectRepository } from "./project-integration";
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("CMS_WRITES_ENABLED", "true"); vi.stubEnv("PROJECT_INTEGRATION_ENABLED", "true"); vi.stubEnv("VERCEL_ENV", "production");
  m.auth.mockResolvedValue({ githubId: "1" });
  m.repository.mockResolvedValue({ id: 42, name: "repo", full_name: "owner/repo", default_branch: "main", description: "Description" });
  m.config.mockResolvedValue(null); m.findProject.mockResolvedValue(null); m.findSlug.mockResolvedValue(null); m.createProject.mockResolvedValue({ id: "project" });
});
afterEach(() => vi.unstubAllEnvs());
describe("automatic project connection", () => {
  it("blocks Preview before reading repository or writing data", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    await expect(connectProjectRepository("owner/repo")).rejects.toThrow("disabled");
    expect(m.repository).not.toHaveBeenCalled(); expect(m.createProject).not.toHaveBeenCalled();
  });
  it("reuses an existing repository binding without overwriting its content", async () => {
    m.config.mockResolvedValue({ projectId: "existing" });
    expect(await connectProjectRepository("owner/repo")).toBe("existing");
    expect(m.createProject).not.toHaveBeenCalled(); expect(m.createConfig).not.toHaveBeenCalled();
  });
  it("creates an initially hidden project using only repository metadata", async () => {
    expect(await connectProjectRepository("owner/repo")).toBe("project");
    expect(m.createProject).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ slug: "repo", showOnPortfolio: false, repositoryFullName: "owner/repo" }) }));
    expect(m.createConfig).toHaveBeenCalledWith({ data: { projectId: "project", repositoryId: "42", branch: "main", sourcePaths: [], enabled: true } });
  });
});
