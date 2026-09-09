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
vi.mock("../document-workspace", () => ({
  PublishForm: ({ enabled }: { enabled: boolean }) => <span data-publication-enabled={enabled} />,
}));

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
    expect(html).not.toContain("data-publication-enabled");
  });

  it("uses the shared printable document view for cover letters", async () => {
    vi.mocked(getAdminDocumentArtifact).mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000003",
      kind: DocumentKind.COVER_LETTER,
      locale: Locale.ES,
      status: DocumentStatus.DRAFT,
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
    expect(html).not.toContain("data-publication-enabled");
  });

  it.each([DocumentStatus.DRAFT, DocumentStatus.PUBLISHED, DocumentStatus.ARCHIVED])(
    "keeps publication feedback mounted for a public CV in state %s",
    async (status) => {
      const id = "00000000-0000-4000-8000-000000000001";
      vi.mocked(getAdminDocumentArtifact).mockResolvedValue({
        id, kind: DocumentKind.PUBLIC_CV, locale: Locale.EN, status,
        title: "Public CV", sourceHash: "hash", model: "test-model", applicationId: null,
        createdAt: new Date("2026-09-01T00:00:00.000Z"),
        publishedAt: status === DocumentStatus.DRAFT ? null : new Date("2026-09-02T00:00:00.000Z"),
        content: {
          type: "public_cv",
          portfolio: {
            profile: {
              fullName: "Ada Lovelace", email: null, title: "Engineer",
              longBio: "Professional summary", contactText: "", socialLinks: [],
            },
            experience: [], education: [], projects: [], skillCategories: [],
          },
        },
      });
      const page = await DocumentPreviewPage({ params: Promise.resolve({ lang: "en", id }) });
      expect(renderToStaticMarkup(page)).toContain(
        `data-publication-enabled="${status === DocumentStatus.DRAFT}"`,
      );
    },
  );
});
