import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), config: vi.fn(), draft: vi.fn(), remove: vi.fn(), update: vi.fn(), translation: vi.fn(), projectUpdate: vi.fn(), repository: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin: m.auth }));
vi.mock("@/lib/projects/github", () => ({ getRepository: m.repository }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ projectIntegration: { findUnique: m.config } }) }));
vi.mock("@/lib/projects/sync", () => ({ serializable: async (fn: (tx: unknown) => unknown) => fn({
  projectKnowledge: { findFirst: m.draft, deleteMany: m.remove, update: m.update },
  projectIntegration: { findUnique: m.config }, project: { update: m.projectUpdate }, projectTranslation: { update: m.translation },
}) }));
import { publishProjectKnowledge } from "./project-integration";
const date = new Date("2026-09-01T00:00:00Z");
const content = { es: { summary: "Resumen del proyecto", problem: "Problema", solution: "Solución", architecture: "Arquitectura", decisions: "Decisiones", results: "Resultados" }, en: { summary: "Project summary", problem: "Problem", solution: "Solution", architecture: "Architecture", decisions: "Decisions", results: "Results" } };
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("CMS_WRITES_ENABLED", "true"); vi.stubEnv("PROJECT_INTEGRATION_ENABLED", "true"); vi.stubEnv("VERCEL_ENV", "production");
  m.auth.mockResolvedValue({ githubId: "1" });
  m.repository.mockResolvedValue({ id: 42, private: false });
  m.config.mockResolvedValue({ repositoryId: "42", enabled: true, updatedAt: date, project: { updatedAt: date } });
  m.draft.mockResolvedValue({ id: "draft", configurationUpdatedAt: date, projectUpdatedAt: date });
});
afterEach(() => vi.unstubAllEnvs());
describe("project corpus publication", () => {
  it("blocks Preview before provider or persistence calls", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    await expect(publishProjectKnowledge("project", "draft", content)).rejects.toThrow("disabled");
    expect(m.repository).not.toHaveBeenCalled(); expect(m.remove).not.toHaveBeenCalled();
  });
  it("rejects an editorial change since generation before deleting the published corpus", async () => {
    m.draft.mockResolvedValue({ id: "draft", configurationUpdatedAt: date, projectUpdatedAt: new Date(0) });
    expect(await publishProjectKnowledge("project", "draft", content)).toBe(false);
    expect(m.remove).not.toHaveBeenCalled(); expect(m.translation).not.toHaveBeenCalled();
  });
  it("publishes both languages and the corpus together after checking public repository access", async () => {
    expect(await publishProjectKnowledge("project", "draft", content)).toBe(true);
    expect(m.repository).toHaveBeenCalledWith("42");
    expect(m.remove).toHaveBeenCalledWith({ where: { projectId: "project", status: "PUBLISHED" } });
    expect(m.translation).toHaveBeenCalledTimes(2);
    expect(m.projectUpdate).toHaveBeenCalledWith({ where: { id: "project" }, data: { showOnPortfolio: true } });
  });
});
