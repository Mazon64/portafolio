import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  findJob: vi.fn(), updateJob: vi.fn(), findConfig: vi.fn(), findExisting: vi.fn(), countJobs: vi.fn(), createJob: vi.fn(),
  transaction: vi.fn(), getRepo: vi.fn(), getSha: vi.fn(), getSources: vi.fn(), embed: vi.fn(), narrative: vi.fn(),
  query: vi.fn(), execute: vi.fn(), deleteDraft: vi.fn(), createDraft: vi.fn(),
  discover: vi.fn(), images: vi.fn(), published: vi.fn(), translation: vi.fn(), updateProject: vi.fn(), cache: vi.fn(),
  disableConfig: vi.fn(), retireKnowledge: vi.fn(), hideProject: vi.fn(), archiveDocuments: vi.fn(),
  policies: vi.fn(), governance: vi.fn(), findPolicy: vi.fn(), touchProject: vi.fn(), digest: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidateTag: mocks.cache }));
vi.mock("./discovery", () => ({ discoverProject: mocks.discover }));
vi.mock("./media", () => ({ analyzeRepositoryImages: mocks.images }));
vi.mock("@/lib/projects/github", () => ({ getRepository: mocks.getRepo, getBranchSha: mocks.getSha, getProjectSources: mocks.getSources }));
vi.mock("./source", () => ({ openRepository: async (id: string, hint: string | null) => ({ repository: await mocks.getRepo(id, hint), access: "public", activity: true, json: vi.fn().mockResolvedValue([]) }) }));
vi.mock("@/data/project-disclosure", () => ({ disclosurePolicies: mocks.policies, governanceEnabled: mocks.governance }));
vi.mock("@/lib/projects/ai", () => ({ digestSources: mocks.digest, digestModel: () => "digest-model", DIGEST_POLICY: "digest-test", embedTexts: mocks.embed, generateProjectNarrative: mocks.narrative, projectAiFailureCode: () => "TEST_FAILURE" }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({
  $transaction: mocks.transaction, $queryRaw: mocks.query,
  projectSyncJob: { findFirst: mocks.findJob, updateMany: mocks.updateJob },
  projectIntegration: { findUnique: mocks.findConfig },
  projectKnowledge: { findFirst: mocks.published }, project: { updateMany: mocks.touchProject },
}) }));
import { corpusFingerprint, enqueueProjectSync, processProjectSync } from "./sync";
import { getDocumentGenerationModel } from "@/lib/documents/gemini";
const date = new Date("2026-09-01T00:00:00Z");
const config = { projectId: "project", repositoryId: "42", branch: "main", sourcePaths: ["README.md"], assets: [], milestones: [], enabled: true, updatedAt: date, project: { updatedAt: date } };
const text = { summary: "A documented project summary.", problem: "Documented problem.", solution: "Documented solution.", architecture: "Documented architecture.", decisions: "Documented decisions.", results: "Documented results." };
const metadata = { repositoryId: "42", repositoryFullName: "owner/repo", branch: "main", demoUrl: null, techStack: ["Next.js"], status: "IN_PROGRESS", sourcePaths: ["README.md"] };
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("CMS_WRITES_ENABLED", "true"); vi.stubEnv("PROJECT_INTEGRATION_ENABLED", "true"); vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("GEMINI_API_KEYS", "test-key");
  mocks.findJob.mockResolvedValue({ id: "job", projectId: "project", status: "QUEUED", attempts: 0, leaseToken: null, requestedSha: null, configurationUpdatedAt: date });
  mocks.updateJob.mockResolvedValue({ count: 1 }); mocks.findConfig.mockResolvedValue(config);
  mocks.findExisting.mockResolvedValue(null); mocks.countJobs.mockResolvedValue(0); mocks.createJob.mockResolvedValue({ id: "job" });
  mocks.getRepo.mockResolvedValue({ id: 42, full_name: "owner/repo", name: "repo", default_branch: "main" }); mocks.getSha.mockResolvedValue("a".repeat(40));
  mocks.getSources.mockResolvedValue([{ path: "README.md", ordinal: 0, content: "Source", sourceHash: "hash", sourceUrl: "https://github.com/owner/repo" }]);
  mocks.discover.mockResolvedValue({ chunks: [{ path: "README.md", ordinal: 0, content: "Owner acceptance remains pending.", sourceHash: "a".repeat(64), sourceUrl: "https://github.com/owner/repo" }], images: [], metadata });
  mocks.images.mockResolvedValue([]); mocks.published.mockResolvedValue(null);
  mocks.policies.mockResolvedValue([]); mocks.governance.mockReturnValue(false); mocks.digest.mockResolvedValue([]);
  mocks.query.mockResolvedValue([]); mocks.embed.mockResolvedValue(["[1]"]); mocks.narrative.mockResolvedValue({ content: { names: { es: "Proyecto", en: "Project" }, narrative: { es: text, en: text }, milestones: [] }, model: "test" });
  mocks.createDraft.mockResolvedValue({ id: "draft" }); mocks.execute.mockResolvedValue(1);
  mocks.transaction.mockImplementation(async (fn) => fn({
    projectIntegration: { findUnique: mocks.findConfig, updateMany: mocks.disableConfig },
    projectSyncJob: { findUnique: mocks.findExisting, count: mocks.countJobs, create: mocks.createJob, updateMany: mocks.updateJob },
    projectKnowledge: { deleteMany: mocks.deleteDraft, create: mocks.createDraft, updateMany: mocks.retireKnowledge }, $executeRaw: mocks.execute,
    project: { update: mocks.updateProject, updateMany: mocks.hideProject }, projectTranslation: { upsert: mocks.translation },
    documentArtifact: { updateMany: mocks.archiveDocuments }, projectDisclosurePolicy: { findUnique: mocks.findPolicy, upsert: vi.fn() },
  }));
});
afterEach(() => vi.unstubAllEnvs());
describe("durable project processing", () => {
  it("withdraws the published project when repository access becomes private", async () => {
    mocks.getRepo.mockRejectedValue(new Error("Project sources must be public"));
    expect(await processProjectSync()).toEqual({ status: "withdrawn" });
    expect(mocks.hideProject).toHaveBeenCalledWith({ where: { id: "project" }, data: { showOnPortfolio: false, showOnCv: false } });
    expect(mocks.retireKnowledge).toHaveBeenCalled(); expect(mocks.archiveDocuments).toHaveBeenCalled(); expect(mocks.narrative).not.toHaveBeenCalled();
  });
  it("withdraws a private repository that was never opted into publication", async () => {
    mocks.getRepo.mockResolvedValue({ id: 42, full_name: "owner/repo", name: "repo", default_branch: "main", private: true });
    expect(await processProjectSync()).toEqual({ status: "withdrawn" });
    expect(mocks.narrative).not.toHaveBeenCalled(); expect(mocks.discover).not.toHaveBeenCalled();
  });
  it("publishes a derived description of an opted-in private repository without its images", async () => {
    const { privateDerivedDisclosure } = await import("./disclosure");
    mocks.governance.mockReturnValue(true);
    mocks.policies.mockResolvedValue([{ projectId: "project", slug: "repo", revision: "rev", policy: privateDerivedDisclosure(["7"]) }]);
    mocks.findPolicy.mockResolvedValue({ revision: "rev" });
    mocks.getRepo.mockResolvedValue({ id: 42, full_name: "owner/repo", name: "repo", default_branch: "main", private: true });
    expect(await processProjectSync()).toEqual({ status: "succeeded" });
    expect(mocks.images).not.toHaveBeenCalled(); expect(mocks.narrative).toHaveBeenCalled();
  });
  it("reuses the published snapshot without AI calls when the corpus is unchanged", async () => {
    const chunks = [{ path: "README.md", ordinal: 0, content: "Owner acceptance remains pending.", sourceHash: "a".repeat(64), sourceUrl: "https://github.com/owner/repo" }];
    const corpusHash = corpusFingerprint(chunks, getDocumentGenerationModel());
    mocks.published.mockResolvedValue({ narrative: { automatic: true, names: { es: "Proyecto", en: "Project" }, es: text, en: text, assets: [], milestones: [], metadata: { ...metadata, corpusHash } } });
    expect(await processProjectSync()).toEqual({ status: "unchanged" });
    expect(mocks.narrative).not.toHaveBeenCalled(); expect(mocks.embed).not.toHaveBeenCalled(); expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.updateJob).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "UNCHANGED" }) }));
    expect(mocks.touchProject).toHaveBeenCalledWith({ where: { id: "project" }, data: { lastTelemetryAt: expect.any(Date) } });
  });
  it("fingerprints content independently of commit and order but not of the model", () => {
    const a = { path: "README.md", ordinal: 0, sourceHash: "a".repeat(64) }, b = { path: "docs/srs.md", ordinal: 1, sourceHash: "b".repeat(64) };
    expect(corpusFingerprint([a, b], "m")).toBe(corpusFingerprint([b, a], "m"));
    expect(corpusFingerprint([a, b], "m")).not.toBe(corpusFingerprint([a, b], "other"));
    expect(corpusFingerprint([a], "m")).not.toBe(corpusFingerprint([{ ...a, sourceHash: "c".repeat(64) }], "m"));
  });
  it("does not withdraw a public project just because one source file is missing", async () => {
    mocks.discover.mockRejectedValue(new Error("GitHub HTTP 404"));
    expect(await processProjectSync()).toEqual({ status: "retrying" });
    expect(mocks.hideProject).not.toHaveBeenCalled();
  });
  it("reevaluates persisted legacy milestones and saves their evidence atomically", async () => {
    const previous = [{ id: "admin", title: { es: "Aceptación", en: "Acceptance" }, completed: true, weight: 10, evidence: "https://example.com/old" }];
    mocks.published.mockResolvedValue({ narrative: { automatic: true, names: { es: "Proyecto", en: "Project" }, es: text, en: text, assets: [], milestones: previous, metadata } });
    mocks.narrative.mockResolvedValue({ content: { names: { es: "Proyecto", en: "Project" }, narrative: { es: text, en: text }, milestones: [{ previousId: "admin", title: previous[0].title, status: "pending", reason: { es: "Falta aceptación.", en: "Acceptance is pending." }, citations: [{ sourceId: "source-0", quote: "Owner acceptance remains pending." }] }] }, model: "test" });
    expect(await processProjectSync()).toEqual({ status: "succeeded" });
    expect(mocks.narrative).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ previousMilestones: previous }));
    const saved = mocks.createDraft.mock.calls[0][0].data.narrative;
    expect(saved.metadata.milestonePolicy).toBe("ai-v1");
    expect(saved.milestones[0]).toMatchObject({ id: "admin", weight: 1, completed: false, assessment: { status: "pending" } });
    expect(mocks.updateProject).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ progressPct: 0 }) }));
  });
  it("preserves the previous publication when generated milestones omit an existing goal", async () => {
    mocks.published.mockResolvedValue({ narrative: { automatic: true, names: { es: "Proyecto", en: "Project" }, es: text, en: text, assets: [], milestones: [{ id: "admin", title: { es: "Admin", en: "Admin" }, completed: false, weight: 1, evidence: "" }], metadata } });
    expect(await processProjectSync()).toEqual({ status: "retrying" });
    expect(mocks.deleteDraft).not.toHaveBeenCalled();
    expect(mocks.updateProject).not.toHaveBeenCalled();
  });
  it("does not carry milestone identity across different repository IDs", async () => {
    mocks.published.mockResolvedValue({ narrative: { automatic: true, names: { es: "Otro", en: "Other" }, es: text, en: text, assets: [], milestones: [{ id: "other", title: { es: "Otro", en: "Other" }, completed: true, weight: 1, evidence: "" }], metadata: { ...metadata, repositoryId: "99" } } });
    expect(await processProjectSync()).toEqual({ status: "succeeded" });
    expect(mocks.narrative).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ previousMilestones: [] }));
  });
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
    expect(mocks.discover).not.toHaveBeenCalled();
  });
  it("keeps failed provider work queued with a bounded retry instead of losing it", async () => {
    mocks.embed.mockRejectedValue(new Error("synthetic failure"));
    expect(await processProjectSync()).toEqual({ status: "retrying" });
    expect(mocks.updateJob).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "QUEUED", error: "AI_UNAVAILABLE:TEST_FAILURE", leaseToken: null }) }));
    expect(mocks.createDraft).not.toHaveBeenCalled();
  });
  it("saves the narrative and vectors only after acquiring the commit lease", async () => {
    expect(await processProjectSync()).toEqual({ status: "succeeded" });
    expect(mocks.createDraft).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "PUBLISHED", commitSha: "a".repeat(40), embeddingModel: "gemini-embedding-001" }) }));
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    expect(mocks.translation).toHaveBeenCalledTimes(2);
    expect(mocks.updateProject).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ techStack: ["Next.js"], showOnPortfolio: true }) }));
    expect(mocks.cache).toHaveBeenCalledWith("portfolio", { expire: 0 });
  });
});
