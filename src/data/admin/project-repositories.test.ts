import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ admin: vi.fn(), reader: vi.fn(), generate: vi.fn(), repo: vi.fn(), policy: vi.fn(), updateRepo: vi.fn(), deleteEvidence: vi.fn(), createEvidence: vi.fn(), read: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin: m.admin }));
vi.mock("@/lib/projects/github-app", () => ({ installationReader: m.reader }));
vi.mock("@/lib/projects/ai", () => ({ generateProjectNarrative: m.generate }));
const client = () => ({ projectRepository: { findUniqueOrThrow: m.repo, updateMany: m.updateRepo }, projectDisclosurePolicy: { findUniqueOrThrow: m.policy }, projectEvidence: { deleteMany: m.deleteEvidence, createMany: m.createEvidence } });
vi.mock("@/lib/prisma", () => ({ getPrisma: () => client() }));
vi.mock("@/lib/projects/sync", () => ({ serializable: (operation: (tx: unknown) => unknown) => operation(client()) }));
import { importPrivateEvidence } from "./project-repositories";
import { defaultDisclosure } from "@/lib/projects/disclosure";
const id = "00000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("CMS_WRITES_ENABLED", "true"); vi.stubEnv("PROJECT_GOVERNANCE_ENABLED", "true");
  const updatedAt = new Date();
  m.repo.mockImplementation(async () => ({ id, projectId: id, repositoryId: "42", installationId: "7", enabled: true, sourcePaths: ["README.md"], updatedAt, leaseToken: m.updateRepo.mock.calls[0]?.[0].data.leaseToken, leaseUntil: new Date(Date.now() + 60_000) }));
  m.policy.mockResolvedValue({ revision: id, policy: { ...defaultDisclosure, mode: "INTERNAL", externalAi: "NONE" } });
  m.updateRepo.mockResolvedValue({ count: 1 });
  m.reader.mockResolvedValue({ repository: { full_name: "owner/private", default_branch: "main" }, read: m.read });
  m.read.mockResolvedValueOnce({ commit: { sha: "a".repeat(40) } }).mockResolvedValueOnce({ type: "file", encoding: "base64", content: Buffer.from("Internal source material").toString("base64"), size: 24 });
});
afterEach(() => vi.unstubAllEnvs());
describe("private evidence boundary", () => {
  it("stores selected evidence internally without calling AI when processing is disallowed", async () => {
    await expect(importPrivateEvidence(id)).resolves.toEqual({ imported: 1 });
    expect(m.createEvidence.mock.calls[0][0].data[0]).toMatchObject({ projectId: id, policyRevision: id, path: "README.md", content: "Internal source material" });
    expect(m.generate).not.toHaveBeenCalled();
  });
  it("does not import when a policy changes during acquisition", async () => {
    m.policy.mockResolvedValueOnce({ revision: id, policy: { ...defaultDisclosure, mode: "INTERNAL" } }).mockResolvedValue({ revision: "changed", policy: defaultDisclosure });
    await expect(importPrivateEvidence(id)).rejects.toThrow("Source or policy changed");
    expect(m.createEvidence).not.toHaveBeenCalled(); expect(m.generate).not.toHaveBeenCalled();
  });
  it("does not acquire sources when another worker owns the lease", async () => {
    m.updateRepo.mockResolvedValue({ count: 0 });
    await expect(importPrivateEvidence(id)).rejects.toThrow("busy"); expect(m.reader).not.toHaveBeenCalled();
  });
  it("rejects Preview writes even if flags are incorrectly enabled", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    await expect(importPrivateEvidence(id)).rejects.toThrow("disabled"); expect(m.reader).not.toHaveBeenCalled();
  });
});
