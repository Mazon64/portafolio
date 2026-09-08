import { beforeEach, describe, expect, it, vi } from "vitest";

const getArtifact = vi.hoisted(() => vi.fn());
const exportPdf = vi.hoisted(() => vi.fn());

vi.mock("@/data/admin/documents", () => ({
  getAdminDocumentArtifact: getArtifact,
}));
vi.mock("@/lib/documents/export", () => ({
  exportArtifactPdf: exportPdf,
}));

import { DocumentKind } from "@/generated/prisma/client";
import { GET } from "./route";

const id = "92ccfd93-71a4-4309-b6bc-8e810aabec1e";

beforeEach(() => {
  getArtifact.mockReset();
  exportPdf.mockReset();
});

describe("document download route", () => {
  it("rejects DOCX without loading the artifact", async () => {
    const response = await GET(
      new Request(`http://localhost/download?format=docx`),
      { params: Promise.resolve({ id }) },
    );

    expect(response.status).toBe(404);
    expect(getArtifact).not.toHaveBeenCalled();
  });

  it("returns persisted private documents as PDF", async () => {
    getArtifact.mockResolvedValue({
      kind: DocumentKind.ATS_CV,
      title: "Senior Engineer / Platform",
      content: { type: "ats_cv" },
    });
    exportPdf.mockResolvedValue(Uint8Array.from([37, 80, 68, 70]));

    const response = await GET(
      new Request(`http://localhost/download?format=pdf`),
      { params: Promise.resolve({ id }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="senior-engineer-platform.pdf"',
    );
    expect(exportPdf).toHaveBeenCalledWith(DocumentKind.ATS_CV, {
      type: "ats_cv",
    });
  });
});
