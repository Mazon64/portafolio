import { describe, expect, it } from "vitest";
import { canPublish, canPublishPrivateRepository, canUsePublicSources, defaultDisclosure, disclosureSchema, privateDerivedDisclosure, projectProjection } from "./disclosure";
const source = { slug: "neutral-case", name: "Secret product", summary: "Secret customer", detailedInfo: "Internal implementation", techStack: ["Secret tool"], repositoryUrl: "https://github.com/company/secret", demoUrl: "https://secret.test", status: "completed" as const, progressPct: 100, lastTelemetryAt: "2026-10-03" };
describe("project disclosure boundary", () => {
  it("replaces restricted source data instead of falling back to internal facts", () => {
    const policy = structuredClone(defaultDisclosure); policy.mode = "SELECTIVE";
    policy.approved.name = { es: "Caso", en: "Case" }; policy.approved.summary = { es: "Resumen autorizado", en: "Approved summary" };
    const projected = projectProjection(source, policy, "en", "chat");
    expect(projected).toMatchObject({ name: "Case", summary: "Approved summary", detailedInfo: "", repositoryUrl: null, demoUrl: null, techStack: [], progressPct: 0, lastTelemetryAt: null });
    expect(JSON.stringify(projected)).not.toContain("Secret"); expect(canUsePublicSources(policy, "chat")).toBe(false);
  });
  it("enforces each surface, embargo and exclusions independently", () => {
    for (const mode of ["INTERNAL", "EXCLUDED"] as const) expect(projectProjection(source, { ...defaultDisclosure, mode }, "en", "portfolio")).toBeNull();
    const policy = { ...defaultDisclosure, surfaces: { ...defaultDisclosure.surfaces, chat: false } };
    expect(canPublish(policy, "portfolio")).toBe(true); expect(canPublish(policy, "chat")).toBe(false);
    expect(canPublish({ ...policy, embargoUntil: "2030-01-01T00:00:00Z" }, "portfolio", Date.parse("2026-10-03"))).toBe(false);
  });
  it("rejects anonymous references and missing authorized identities", () => {
    expect(disclosureSchema.safeParse({ ...defaultDisclosure, mode: "ANONYMIZED" }).success).toBe(false);
    expect(disclosureSchema.safeParse({ ...defaultDisclosure, mode: "SELECTIVE" }).success).toBe(false);
  });
  it("does not infer ownership and never exposes internal owner or GitHub IDs", () => {
    const result = projectProjection(source, { ...defaultDisclosure, owner: "Confidential owner", participation: { ...defaultDisclosure.participation, githubIds: ["123"] } }, "en", "portfolio");
    expect(result?.participation?.relationship).toBe("UNSPECIFIED");
    expect(JSON.stringify(result)).not.toContain("Confidential owner"); expect(JSON.stringify(result)).not.toContain("githubIds");
  });
  it("admits a private repository only through a complete, explicit opt-in", () => {
    const derived = privateDerivedDisclosure(["7"]);
    expect(disclosureSchema.parse(derived)).toMatchObject({ privateSources: "PUBLISH_DERIVED" });
    expect(canPublishPrivateRepository(derived)).toBe(true);
    expect(canPublishPrivateRepository(undefined)).toBe(false);
    expect(canPublishPrivateRepository(defaultDisclosure)).toBe(false);
    expect(canPublishPrivateRepository({ ...derived, fields: { ...derived.fields, sources: true } })).toBe(false);
    expect(canPublishPrivateRepository({ ...derived, externalAi: "PUBLIC_ONLY" })).toBe(false);
    // A revocation that only flips the mode stays parseable and inert.
    expect(canPublishPrivateRepository(disclosureSchema.parse({ ...derived, mode: "INTERNAL" }))).toBe(false);
    const legacy: Record<string, unknown> = { ...defaultDisclosure };
    delete legacy.privateSources;
    expect(disclosureSchema.parse(legacy).privateSources).toBe("INTERNAL");
  });
});
