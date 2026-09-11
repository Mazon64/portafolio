import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { findConfig, enqueue, processJob, afterMock } = vi.hoisted(() => ({ findConfig: vi.fn(), enqueue: vi.fn(), processJob: vi.fn(), afterMock: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: afterMock }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ projectIntegration: { findUnique: findConfig } }) }));
vi.mock("@/lib/projects/sync", () => ({ enqueueProjectSync: enqueue, processProjectSync: processJob }));
import { POST } from "./route";
const secret = "synthetic-webhook-secret";
function request(payload = { ref: "refs/heads/main", after: "a".repeat(40), deleted: false, repository: { id: 42, private: false } }) {
  const body = JSON.stringify(payload);
  return new Request("https://example.test/api/webhooks/github", { method: "POST", body,
    headers: { "x-github-event": "push", "x-github-delivery": "2eb66473-aca8-4f1f-a312-9a697b75a2e3", "x-hub-signature-256": `sha256=${createHmac("sha256", secret).update(body).digest("hex")}` } });
}
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("CMS_WRITES_ENABLED", "true"); vi.stubEnv("PROJECT_INTEGRATION_ENABLED", "true"); vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("GITHUB_WEBHOOK_SECRET", secret);
  findConfig.mockResolvedValue({ projectId: "project", enabled: true, branch: "main" });
  enqueue.mockResolvedValue({ id: "job", duplicate: false });
});
afterEach(() => vi.unstubAllEnvs());
describe("GitHub webhook", () => {
  it("blocks Preview before database access even with enabled flags", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect((await POST(request())).status).toBe(503);
    expect(findConfig).not.toHaveBeenCalled(); expect(enqueue).not.toHaveBeenCalled();
  });
  it("rejects a tampered raw payload before database access", async () => {
    const req = request(); req.headers.set("x-hub-signature-256", `sha256=${"0".repeat(64)}`);
    expect((await POST(req)).status).toBe(403); expect(findConfig).not.toHaveBeenCalled();
  });
  it("persists before scheduling background work and responds accepted", async () => {
    const response = await POST(request());
    expect(response.status).toBe(202); expect(await response.json()).toEqual({ status: "accepted" });
    expect(enqueue).toHaveBeenCalledWith("project", "github:2eb66473-aca8-4f1f-a312-9a697b75a2e3", "a".repeat(40));
    expect(afterMock).toHaveBeenCalledOnce(); expect(processJob).not.toHaveBeenCalled();
  });
  it("does not schedule duplicate deliveries or other branches", async () => {
    enqueue.mockResolvedValue({ duplicate: true });
    expect(await (await POST(request())).json()).toEqual({ status: "duplicate" });
    expect(afterMock).not.toHaveBeenCalled();
    enqueue.mockClear(); findConfig.mockResolvedValue({ projectId: "project", enabled: true, branch: "develop" });
    expect(await (await POST(request())).json()).toEqual({ status: "ignored" });
    expect(enqueue).not.toHaveBeenCalled();
  });
  it("does not import an unlinked repository", async () => {
    findConfig.mockResolvedValue(null);
    expect(await (await POST(request())).json()).toEqual({ status: "ignored" });
    expect(enqueue).not.toHaveBeenCalled();
  });
});
