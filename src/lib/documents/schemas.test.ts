import { describe, expect, it } from "vitest";

import { atsArtifactSchema, coverLetterArtifactSchema } from "./schemas";

describe("generated document schemas", () => {
  it("accepts a structured ATS document", () => {
    expect(
      atsArtifactSchema.safeParse({
        type: "ats_cv",
        locale: "en",
        name: "Ada Lovelace",
        headline: "Software Engineer",
        contact: ["ada@example.com"],
        summary: "A grounded professional summary with enough detail to satisfy validation.",
        skills: ["TypeScript"],
        experience: [
          {
            title: "Engineer",
            subtitle: "Example",
            period: "2024 - Present",
            bullets: ["Built documented systems from verified requirements."],
          },
        ],
        education: [],
        projects: [],
      }).success,
    ).toBe(true);
  });

  it("rejects incomplete cover letters", () => {
    expect(
      coverLetterArtifactSchema.safeParse({
        type: "cover_letter",
        locale: "en",
        subject: "Application",
        salutation: "Hello",
        paragraphs: ["Too short"],
        closing: "Regards",
        name: "Ada",
      }).success,
    ).toBe(false);
  });
});
