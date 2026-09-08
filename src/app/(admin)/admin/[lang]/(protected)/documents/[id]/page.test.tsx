import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/data/admin/documents", () => ({
  getAdminDocumentArtifact: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("Not found");
  }),
}));
vi.mock("../document-workspace", () => ({ PublishForm: () => null }));

import { getAdminDocumentArtifact } from "@/data/admin/documents";
import { DocumentKind, DocumentStatus, Locale } from "@/generated/prisma/client";
import DocumentPreviewPage from "./page";

describe("DocumentPreviewPage", () => {
  it("uses the shared printable document view for ATS artifacts", async () => {
    vi.mocked(getAdminDocumentArtifact).mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000001",
      kind: DocumentKind.ATS_CV,
      locale: Locale.EN,
      status: DocumentStatus.DRAFT,
      version: 1,
      title: "Backend Engineer CV",
      sourceHash: "source-hash",
      model: "test-model",
      applicationId: "00000000-0000-4000-8000-000000000002",
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      publishedAt: null,
      content: {
        type: "ats_cv",
        locale: "en",
        name: "Ada Lovelace",
        headline: "Backend Engineer",
        contact: ["ada@example.com", "davidaranda.dev"],
        summary: "Builds reliable software systems with careful attention to architecture, operations, and measurable outcomes.",
        skills: ["TypeScript", "PostgreSQL"],
        experience: [{
          title: "Software Engineer",
          subtitle: "Analytical Engines",
          period: "2022 - Present",
          bullets: ["Designed and operated reliable analytical services."],
        }],
        projects: [],
        education: [],
      },
    });

    const page = await DocumentPreviewPage({
      params: Promise.resolve({
        lang: "en",
        id: "00000000-0000-4000-8000-000000000001",
      }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("print-document");
    expect(html).toContain("professional-document");
    expect(html).toContain("max-w-[210mm]");
    expect(html).toContain("Print or save as PDF");
    expect(html).toContain("data-print-hidden");
    expect(html).toContain('aria-label="Contact information"');
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("ada@example.com");
    expect(html).toContain("Analytical Engines");
  });

  it("uses the shared printable document view for cover letters", async () => {
    vi.mocked(getAdminDocumentArtifact).mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000003",
      kind: DocumentKind.COVER_LETTER,
      locale: Locale.ES,
      status: DocumentStatus.DRAFT,
      version: 1,
      title: "Carta para Example",
      sourceHash: "source-hash",
      model: "test-model",
      applicationId: "00000000-0000-4000-8000-000000000002",
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      publishedAt: null,
      content: {
        type: "cover_letter",
        locale: "es",
        subject: "Postulación a ingeniería de software",
        salutation: "Equipo de contratación:",
        paragraphs: [
          "Presento mi candidatura porque mi experiencia coincide con las necesidades descritas para este puesto.",
          "He desarrollado sistemas mantenibles y trabajado con equipos responsables de productos en producción.",
          "Puedo aportar esa experiencia y conversar con detalle sobre las responsabilidades de la posición.",
        ],
        closing: "Atentamente,",
        name: "Ada Lovelace",
      },
    });

    const page = await DocumentPreviewPage({
      params: Promise.resolve({
        lang: "es",
        id: "00000000-0000-4000-8000-000000000003",
      }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("print-document");
    expect(html).toContain("professional-document");
    expect(html).toContain("Imprimir o guardar como PDF");
    expect(html).toContain("Equipo de contratación:");
  });
});
