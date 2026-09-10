import { afterEach, describe, expect, it, vi } from "vitest";
const upsert = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("./sync", () => ({ serializable: async (fn: (tx: unknown) => unknown) => fn({ projectQueryQuota: { upsert } }) }));
import { consumeProjectQuestionQuota, ProjectRateLimitError } from "./quota";
afterEach(() => { vi.unstubAllEnvs(); upsert.mockReset(); });
describe("project question budgets", () => {
  it("checks client, global minute and daily budgets without storing raw client identifiers", async () => {
    vi.stubEnv("AUTH_SECRET", "synthetic-secret"); upsert.mockResolvedValue({ count: 1 });
    await consumeProjectQuestionQuota("203.0.113.1");
    expect(upsert).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(upsert.mock.calls)).not.toContain("203.0.113.1");
    expect(upsert.mock.calls[2][0].where.key).toMatch(/^project:day:/);
  });
  it("stops at the per-client cap and propagates a transaction rollback error", async () => {
    vi.stubEnv("AUTH_SECRET", "synthetic-secret"); upsert.mockResolvedValue({ count: 4 });
    await expect(consumeProjectQuestionQuota("203.0.113.1")).rejects.toBeInstanceOf(ProjectRateLimitError);
    expect(upsert).toHaveBeenCalledOnce();
  });
});
