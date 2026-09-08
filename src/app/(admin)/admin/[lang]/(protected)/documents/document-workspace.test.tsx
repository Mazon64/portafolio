import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({
  generateApplicationAction: vi.fn(),
  generatePublicCvAction: vi.fn(),
  publishPublicCvAction: vi.fn(),
  saveAiContextAction: vi.fn(),
  saveApplicationDocumentsAction: vi.fn(),
  savePublicCvDraftAction: vi.fn(),
}));

import { DocumentKind, DocumentStatus, Locale } from "@/generated/prisma/client";
import { adminCopy } from "@/i18n/admin";
import { DocumentWorkspace } from "./document-workspace";

describe("DocumentWorkspace", () => {
  it("offers PDF as the only private document export", () => {
    const html = renderToStaticMarkup(
      <DocumentWorkspace
        locale="en"
        copy={adminCopy.en.documents}
        sourceHashes={{ es: "es-hash", en: "en-hash" }}
        workspace={{
          schemaReady: true,
          history: { page: 1, totalPages: 1, totalItems: 1 },
          context: null,
          artifacts: [{
            id: "00000000-0000-4000-8000-000000000001",
            kind: DocumentKind.ATS_CV,
            locale: Locale.EN,
            status: DocumentStatus.DRAFT,
            version: 1,
            title: "Backend Engineer CV",
            sourceHash: "en-hash",
            createdAt: "2026-09-01T00:00:00.000Z",
            publishedAt: null,
            application: { company: "Analytical Engines", role: "Engineer" },
          }],
        }}
      />,
    );

    expect(html).toContain("download?format=pdf");
    expect(html).toContain(">PDF<");
    expect(html).not.toContain("format=docx");
    expect(html).not.toContain("DOCX");
  });
});
