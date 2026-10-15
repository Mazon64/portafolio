import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), writes: vi.fn(), governance: vi.fn(), current: vi.fn(), upsert: vi.fn(), project: vi.fn(), media: vi.fn(), invalidate: vi.fn(), jobs: vi.fn(), artifacts: vi.fn(), turns: vi.fn(), conversations: vi.fn(), evidence: vi.fn(), repositories: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin: m.auth }));
vi.mock("@/config/env", () => ({ isCmsWriteEnabled: m.writes }));
vi.mock("@/data/project-disclosure", () => ({ governanceEnabled: m.governance }));
vi.mock("@/lib/projects/sync", () => ({ serializable: (fn: (tx: unknown) => unknown) => fn({ projectDisclosurePolicy: { findUnique: m.current, upsert: m.upsert }, project: { update: m.project }, projectMedia: { count: m.media }, projectIntegration: { updateMany: m.invalidate }, projectSyncJob: { updateMany: m.jobs }, documentArtifact: { updateMany: m.artifacts }, chatTurn: { updateMany: m.turns }, chatConversation: { updateMany: m.conversations }, projectEvidence: { deleteMany: m.evidence }, projectRepository: { updateMany: m.repositories } }) }));
import { saveProjectDisclosure } from "./project-disclosure";
import { defaultDisclosure, projectProjection } from "@/lib/projects/disclosure";

const input = { projectId: "726d3566-388e-492e-a916-00c255032c40", publicSlug: "portfolio", revision: "", policy: { ...defaultDisclosure, relationship: "EMPLOYEE", participation: { ...defaultDisclosure.participation, status: "FINISHED", role: { es: "Backend", en: "Backend" } } } };
beforeEach(() => { vi.clearAllMocks(); m.writes.mockReturnValue(true); m.governance.mockReturnValue(true); m.current.mockResolvedValue(null); });
describe("project policy persistence", () => {
  it("persists participation and invalidates derived publications in the same transaction", async () => {
    const result = await saveProjectDisclosure(input);
    expect(result?.revision).toBeTruthy();
    const saved = m.upsert.mock.calls[0][0].create.policy;
    expect(saved.participation.status).toBe("FINISHED");
    expect(saved.relationship).toBe("EMPLOYEE");
    expect(m.jobs).toHaveBeenCalled(); expect(m.artifacts).toHaveBeenCalled(); expect(m.turns).toHaveBeenCalled();
    const publicProject = projectProjection({ slug: "portfolio", name: "Portfolio", summary: "Summary", detailedInfo: "Details", techStack: [], status: "inProgress", progressPct: 0, lastTelemetryAt: null, repositoryUrl: null, demoUrl: null }, saved, "en", "portfolio");
    expect(publicProject?.participation).toMatchObject({ relationship: "EMPLOYEE", status: "FINISHED", role: "Backend" });
  });
  it("rejects read-only writes and stale revisions before changing publication", async () => {
    m.writes.mockReturnValue(false);
    await expect(saveProjectDisclosure(input)).rejects.toThrow("disabled");
    expect(m.upsert).not.toHaveBeenCalled();
    m.writes.mockReturnValue(true); m.current.mockResolvedValue({ revision: "changed" });
    expect(await saveProjectDisclosure(input)).toBeNull(); expect(m.artifacts).not.toHaveBeenCalled();
  });
});
