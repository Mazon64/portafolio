import { describe, expect, it } from "vitest";

import { aiContextSchema, applicationDocumentSchema } from "./document-schema";

describe("document administration schemas", () => {
  it("validates private context and vacancy data", () => {
    expect(
      aiContextSchema.safeParse({
        professionalContext: "Professional context with enough grounded detail for generation.",
        personalContext: "",
      }).success,
    ).toBe(true);
    expect(
      applicationDocumentSchema.safeParse({
        locale: "en",
        company: "Example",
        role: "Engineer",
        sourceUrl: "https://example.com/jobs/engineer",
        jobDescription: "A".repeat(100),
        notes: "",
      }).success,
    ).toBe(true);
  });

  it("rejects non-HTTPS vacancy URLs", () => {
    expect(
      applicationDocumentSchema.safeParse({
        locale: "en",
        company: "Example",
        role: "Engineer",
        sourceUrl: "http://example.com/job",
        jobDescription: "A".repeat(100),
        notes: "",
      }).success,
    ).toBe(false);
  });
});
