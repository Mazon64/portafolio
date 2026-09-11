import { describe, expect, it } from "vitest";
import { assetsSchema, milestonesSchema, milestoneProgress, sourcePathSchema } from "./schemas";

describe("project source and presentation contracts", () => {
  it("calculates weighted progress and preserves manual mode with no milestones", () => {
    expect(milestoneProgress([])).toBeNull();
    expect(milestoneProgress([
      { id: "core", title: { es: "Base", en: "Core" }, weight: 75, completed: true, evidence: "" },
      { id: "launch", title: { es: "Lanzamiento", en: "Launch" }, weight: 25, completed: false, evidence: "" },
    ])).toBe(75);
  });
  it("rejects traversal, hidden files and arbitrary source formats", () => {
    for (const path of ["../.env", ".env.md", "docs/../secrets.md", "https://host/file.md", "package.json", "docs/%2e%2e/private.md"]) {
      expect(sourcePathSchema.safeParse(path).success).toBe(false);
    }
    expect(sourcePathSchema.parse("docs/architecture.md")).toBe("docs/architecture.md");
  });
  it("requires commit-pinned remote images and bilingual accessible text", () => {
    const base = { alt: { es: "Diagrama", en: "Diagram" }, caption: { es: "Arquitectura", en: "Architecture" } };
    expect(assetsSchema.safeParse([{ ...base, url: "/project-media/portfolio-architecture.svg" }]).success).toBe(true);
    expect(assetsSchema.safeParse([{ ...base, url: `https://raw.githubusercontent.com/Mazon64/portafolio/${"a".repeat(40)}/public/cover.png` }]).success).toBe(true);
    for (const url of ["javascript:alert(1)", "https://private-host/cover.png", "https://raw.githubusercontent.com/Mazon64/portafolio/main/cover.png"]) {
      expect(assetsSchema.safeParse([{ ...base, url }]).success).toBe(false);
    }
  });
  it("rejects duplicate milestone identities and zero weights", () => {
    const milestone = { id: "core", title: { es: "Base", en: "Core" }, weight: 1, completed: false, evidence: "" };
    expect(milestonesSchema.safeParse([milestone, milestone]).success).toBe(false);
    expect(milestonesSchema.safeParse([{ ...milestone, weight: 0 }]).success).toBe(false);
  });
});
