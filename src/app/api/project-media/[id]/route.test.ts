import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ media: vi.fn(), policy: vi.fn(), read: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ projectMedia: { findUnique: m.media }, projectDisclosurePolicy: { findUnique: m.policy } }) }));
vi.mock("@/lib/projects/storage", () => ({ readMedia: m.read }));
import { GET } from "./route";
import { defaultDisclosure } from "@/lib/projects/disclosure";
const id = "00000000-0000-4000-8000-000000000001";
const policy = { ...defaultDisclosure, media: [{ id, category: "interface", alt: { es: "Captura", en: "Screenshot" }, caption: { es: "", en: "" } }] };
const request = () => GET(new Request(`https://example.com/api/project-media/${id}`), { params: Promise.resolve({ id }) });
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("PROJECT_GOVERNANCE_ENABLED", "true");
  m.media.mockResolvedValue({ id, projectId: id, objectKey: `${id}.webp`, project: { showOnPortfolio: true, disclosure: { revision: "v1", policy } } });
  m.policy.mockResolvedValue({ revision: "v1" }); m.read.mockResolvedValue(Buffer.from("image"));
});
afterEach(() => vi.unstubAllEnvs());
describe("revocable public media gateway", () => {
  it("serves only authorized media without public or optimizer caching", async () => {
    const response = await request();
    expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("private, no-store"); expect(response.headers.get("Content-Type")).toBe("image/webp");
  });
  it("does not read storage for unapproved, hidden or anonymous media", async () => {
    for (const denied of [{ ...policy, media: [] }, { ...policy, mode: "INTERNAL" }, { ...policy, mode: "ANONYMIZED", fields: { ...policy.fields, repository: false, sources: false, media: false } }]) {
      m.media.mockResolvedValue({ id, projectId: id, objectKey: `${id}.webp`, project: { showOnPortfolio: true, disclosure: { revision: "v1", policy: denied } } });
      expect((await request()).status).toBe(404);
    }
    expect(m.read).not.toHaveBeenCalled();
  });
  it("withholds bytes when policy changes while storage is being read", async () => {
    m.policy.mockResolvedValue({ revision: "v2" });
    expect((await request()).status).toBe(404);
  });
});
