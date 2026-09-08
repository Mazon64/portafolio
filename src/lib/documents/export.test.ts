import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { DocumentKind } from "@/generated/prisma/client";
import { PDFDocument } from "pdf-lib";
import { exportArtifactPdf } from "./export";

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
  it("creates a valid US Letter PDF", async () => {
    const pdf = await exportArtifactPdf(DocumentKind.ATS_CV, artifact);
    expect(Buffer.from(pdf).subarray(0, 4).toString()).toBe("%PDF");
    const document = await PDFDocument.load(pdf);
    expect(document.getPage(0).getSize()).toEqual({ width: 612, height: 792 });
  });

  it("handles Unicode and long unbroken values without failing PDF export", async () => {
    const pdf = await exportArtifactPdf(DocumentKind.ATS_CV, {
      ...artifact,
      locale: "es",
      name: "José Muñoz",
      headline: `Ingeniería ágil 🚀 ${"https://example.com/".repeat(20)}`,
    });
    expect(Buffer.from(pdf).subarray(0, 4).toString()).toBe("%PDF");
  });

  it("exports cover letters with the same Letter page format", async () => {
    const pdf = await exportArtifactPdf(DocumentKind.COVER_LETTER, {
      type: "cover_letter",
      locale: "es",
      subject: "Postulación: Ingeniería de software",
      salutation: "Equipo de contratación:",
      paragraphs: [
        "Presento mi candidatura porque mi experiencia documentada coincide con las necesidades descritas para el puesto.",
        "He desarrollado sistemas mantenibles con TypeScript y prácticas de entrega que priorizan la calidad del producto.",
        "Puedo aportar esa experiencia al equipo y conversar con detalle sobre el alcance y las responsabilidades del puesto.",
      ],
      closing: "Atentamente,",
      name: "José Muñoz",
    });

    const document = await PDFDocument.load(pdf);
    expect(document.getPage(0).getSize()).toEqual({ width: 612, height: 792 });
  });
});
