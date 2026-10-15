import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const rows = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ projectDisclosurePolicy: { findMany: rows } }) }));
import { applyProjectDisclosure, publicationVersion } from "./project-disclosure";
import { defaultDisclosure } from "@/lib/projects/disclosure";
import type { PortfolioDto } from "./portfolio.types";
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("PROJECT_GOVERNANCE_ENABLED", "true"); });
afterEach(() => vi.unstubAllEnvs());
describe("publication identities", () => {
  it("applies restrictions by stable identity even if the public slug changes mid-read", async () => {
    rows.mockResolvedValue([{ projectId: "id", revision: "v1", project: { slug: "new-alias" }, policy: { ...defaultDisclosure, mode: "INTERNAL" } }]);
    const data = { projects: [{ slug: "old-secret-slug", name: "Secret" }] } as PortfolioDto;
    expect((await applyProjectDisclosure(data, "en", "portfolio", new Map([["old-secret-slug", "id"]]))).projects).toEqual([]);
  });
  it("changes the dependency fingerprint for any policy revision", async () => {
    rows.mockResolvedValue([{ projectId: "id", revision: "v1", project: { slug: "case" }, policy: defaultDisclosure }]);
    const before = await publicationVersion();
    rows.mockResolvedValue([{ projectId: "id", revision: "v2", project: { slug: "case" }, policy: defaultDisclosure }]);
    expect(await publicationVersion()).not.toBe(before);
  });
  it("fails closed if a stored policy is invalid", async () => {
    rows.mockResolvedValue([{ projectId: "id", revision: "v1", project: { slug: "case" }, policy: { mode: "FULL" } }]);
    await expect(publicationVersion()).rejects.toThrow();
  });
});
