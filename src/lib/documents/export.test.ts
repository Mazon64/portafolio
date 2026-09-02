import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { DocumentKind } from "@/generated/prisma/client";
import { exportArtifactDocx, exportArtifactPdf } from "./export";

const artifact = {
  type: "ats_cv" as const,
  locale: "en" as const,
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
};

describe("document exports", () => {
  it("creates valid PDF and DOCX containers", async () => {
    const [pdf, docx] = await Promise.all([
      exportArtifactPdf(DocumentKind.ATS_CV, artifact),
      exportArtifactDocx(DocumentKind.ATS_CV, artifact),
    ]);
    expect(Buffer.from(pdf).subarray(0, 4).toString()).toBe("%PDF");
    expect(docx.subarray(0, 2).toString()).toBe("PK");
  });

  it("handles Unicode and long unbroken values without failing PDF export", async () => {
    const pdf = await exportArtifactPdf(DocumentKind.ATS_CV, {
      ...artifact,
      locale: "es",
      headline: `Ingeniería 🚀 ${"https://example.com/".repeat(20)}`,
    });
    expect(Buffer.from(pdf).subarray(0, 4).toString()).toBe("%PDF");
  });
});
