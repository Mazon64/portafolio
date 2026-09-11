import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), save: vi.fn(), publish: vi.fn(), discard: vi.fn(), retry: vi.fn(), pilot: vi.fn(), enqueue: vi.fn(), process: vi.fn(), tag: vi.fn(), revalidate: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate, updateTag: m.tag }));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin: m.auth }));
vi.mock("@/data/admin/project-integration", () => ({ saveProjectIntegration: m.save, publishProjectKnowledge: m.publish, discardProjectKnowledge: m.discard, retryProjectSync: m.retry, initializePortfolioPilot: m.pilot }));
vi.mock("@/lib/projects/sync", () => ({ enqueueProjectSync: m.enqueue, processProjectSync: m.process }));
import { projectIntegrationAction } from "./integration-actions";
beforeEach(() => {
  vi.resetAllMocks(); m.auth.mockResolvedValue({ githubId: "1" });
  vi.stubEnv("CMS_WRITES_ENABLED", "true"); vi.stubEnv("PROJECT_INTEGRATION_ENABLED", "true"); vi.stubEnv("VERCEL_ENV", "production");
});
afterEach(() => vi.unstubAllEnvs());
describe("project integration action boundary", () => {
  it.each(["pilot", "save", "sync", "process", "retry", "publish", "discard"])("blocks %s in Preview before side effects", async (operation) => {
    vi.stubEnv("VERCEL_ENV", "preview"); const data = new FormData(); data.set("operation", operation);
    expect(await projectIntegrationAction({ status: "idle" }, data)).toEqual({ status: "disabled" });
    for (const mock of [m.save, m.publish, m.discard, m.retry, m.pilot, m.enqueue, m.process]) expect(mock).not.toHaveBeenCalled();
  });
  it("rejects unauthorized callers even when flags are enabled", async () => {
    m.auth.mockRejectedValue(new Error("Unauthorized")); const data = new FormData(); data.set("operation", "pilot");
    expect(await projectIntegrationAction({ status: "idle" }, data)).toEqual({ status: "disabled" }); expect(m.pilot).not.toHaveBeenCalled();
  });
  it("reports post-commit invalidation failure without reporting a failed pilot creation", async () => {
    m.pilot.mockResolvedValue("project"); m.tag.mockImplementation(() => { throw new Error("cache unavailable"); });
    const data = new FormData(); data.set("operation", "pilot");
    expect(await projectIntegrationAction({ status: "idle" }, data)).toEqual({ status: "cache-error", projectId: "project" });
    expect(m.pilot).toHaveBeenCalledOnce(); expect(m.revalidate).toHaveBeenCalledTimes(2);
  });
});
