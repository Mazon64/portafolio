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
  it("presents an ATS artifact as a responsive US Letter document", async () => {
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

    expect(html).toContain("max-w-[8.5in]");
    expect(html).toContain("min-h-[min(11in,calc((100vw-2rem)*1.294))]");
    expect(html).toContain('aria-label="Contact information"');
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("ada@example.com");
    expect(html).toContain("Analytical Engines");
  });
});
