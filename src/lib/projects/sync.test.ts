import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  findJob: vi.fn(), updateJob: vi.fn(), findConfig: vi.fn(), findExisting: vi.fn(), countJobs: vi.fn(), createJob: vi.fn(),
  transaction: vi.fn(), getRepo: vi.fn(), getSha: vi.fn(), getSources: vi.fn(), embed: vi.fn(), narrative: vi.fn(),
  query: vi.fn(), execute: vi.fn(), deleteDraft: vi.fn(), createDraft: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/projects/github", () => ({ getRepository: mocks.getRepo, getBranchSha: mocks.getSha, getProjectSources: mocks.getSources }));
vi.mock("@/lib/projects/ai", () => ({ embedTexts: mocks.embed, generateProjectNarrative: mocks.narrative }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({
  $transaction: mocks.transaction, $queryRaw: mocks.query,
  projectSyncJob: { findFirst: mocks.findJob, updateMany: mocks.updateJob },
  projectIntegration: { findUnique: mocks.findConfig },
}) }));
import { enqueueProjectSync, processProjectSync } from "./sync";
const date = new Date("2026-09-01T00:00:00Z");
const config = { projectId: "project", repositoryId: "42", branch: "main", sourcePaths: ["README.md"], assets: [], milestones: [], enabled: true, updatedAt: date, project: { updatedAt: date } };
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("CMS_WRITES_ENABLED", "true"); vi.stubEnv("PROJECT_INTEGRATION_ENABLED", "true"); vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("GEMINI_API_KEYS", "test-key");
  mocks.findJob.mockResolvedValue({ id: "job", projectId: "project", status: "QUEUED", attempts: 0, leaseToken: null, requestedSha: null, configurationUpdatedAt: date });
  mocks.updateJob.mockResolvedValue({ count: 1 }); mocks.findConfig.mockResolvedValue(config);
  mocks.findExisting.mockResolvedValue(null); mocks.countJobs.mockResolvedValue(0); mocks.createJob.mockResolvedValue({ id: "job" });
  mocks.getRepo.mockResolvedValue({ id: 42, full_name: "owner/repo" }); mocks.getSha.mockResolvedValue("a".repeat(40));
  mocks.getSources.mockResolvedValue([{ path: "README.md", ordinal: 0, content: "Source", sourceHash: "hash", sourceUrl: "https://github.com/owner/repo" }]);
  mocks.query.mockResolvedValue([]); mocks.embed.mockResolvedValue(["[1]"]); mocks.narrative.mockResolvedValue({ content: {}, model: "test" });
  mocks.createDraft.mockResolvedValue({ id: "draft" }); mocks.execute.mockResolvedValue(1);
  mocks.transaction.mockImplementation(async (fn) => fn({
    projectIntegration: { findUnique: mocks.findConfig },
    projectSyncJob: { findUnique: mocks.findExisting, count: mocks.countJobs, create: mocks.createJob, updateMany: mocks.updateJob },
    projectKnowledge: { deleteMany: mocks.deleteDraft, create: mocks.createDraft }, $executeRaw: mocks.execute,
  }));
});
afterEach(() => vi.unstubAllEnvs());
describe("durable project processing", () => {
  it("rejects Preview before claiming jobs or calling providers", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(await processProjectSync()).toEqual({ status: "disabled" }); expect(mocks.findJob).not.toHaveBeenCalled();
  });
  it("deduplicates a delivery before creating work", async () => {
    mocks.findExisting.mockResolvedValue({ id: "existing" });
    expect(await enqueueProjectSync("project", "delivery", null)).toEqual({ id: "existing", duplicate: true });
    expect(mocks.createJob).not.toHaveBeenCalled();
  });
  it("prevents a worker that lost its lease from saving a draft", async () => {
    mocks.updateJob.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    expect(await processProjectSync()).toEqual({ status: "superseded" });
    expect(mocks.createDraft).not.toHaveBeenCalled();
  });
  it("does not import out-of-order commits", async () => {
    mocks.findJob.mockResolvedValue({ id: "job", projectId: "project", status: "QUEUED", attempts: 0, leaseToken: null, requestedSha: "b".repeat(40), configurationUpdatedAt: date });
    expect(await processProjectSync()).toEqual({ status: "superseded" });
    expect(mocks.getSources).not.toHaveBeenCalled();
  });
  it("keeps failed provider work queued with a bounded retry instead of losing it", async () => {
    mocks.embed.mockRejectedValue(new Error("synthetic failure"));
    expect(await processProjectSync()).toEqual({ status: "retrying" });
    expect(mocks.updateJob).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "QUEUED", error: "AI_UNAVAILABLE", leaseToken: null }) }));
    expect(mocks.createDraft).not.toHaveBeenCalled();
  });
  it("saves the narrative and vectors only after acquiring the commit lease", async () => {
    expect(await processProjectSync()).toEqual({ status: "succeeded" });
    expect(mocks.createDraft).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ commitSha: "a".repeat(40), embeddingModel: "gemini-embedding-001" }) }));
    expect(mocks.execute).toHaveBeenCalledTimes(2);
  });
});
