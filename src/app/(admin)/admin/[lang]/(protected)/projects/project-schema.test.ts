import { describe, expect, it } from "vitest";
import { projectSchema } from "./project-schema";

const valid = { id: "", updatedAt: "", slug: "portfolio", repositoryFullName: "Mazon64/portafolio", demoUrl: "https://example.com", repositoryUrl: "https://github.com/Mazon64/portafolio", techStack: "Next.js, PostgreSQL", order: "0", status: "IN_PROGRESS", progressPct: "75", esName: "Portafolio", esSummary: "Resumen", esDetailedInfo: "Detalle", enName: "Portfolio", enSummary: "Summary", enDetailedInfo: "Details" };

describe("project schema", () => {
  it("accepts complete bilingual project content", () => { expect(projectSchema.safeParse(valid).success).toBe(true); });
  it("rejects invalid progress and repository names", () => {
    expect(projectSchema.safeParse({ ...valid, progressPct: "101" }).success).toBe(false);
    expect(projectSchema.safeParse({ ...valid, repositoryFullName: "invalid" }).success).toBe(false);
  });
  it("rejects non-web URL schemes", () => {
    for (const demoUrl of ["javascript:alert(1)", "data:text/html,test", "file:///tmp/test"]) {
      expect(projectSchema.safeParse({ ...valid, demoUrl }).success).toBe(false);
    }
  });
});
