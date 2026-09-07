import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdminMock,
  writesEnabledMock,
  generationEnabledMock,
  createContextMock,
  generatePublicMock,
  savePublicMock,
  saveApplicationMock,
  SourceConflictMock,
  InvalidDraftMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  writesEnabledMock: vi.fn(),
  generationEnabledMock: vi.fn(),
  createContextMock: vi.fn(),
  generatePublicMock: vi.fn(),
  savePublicMock: vi.fn(),
  saveApplicationMock: vi.fn(),
  SourceConflictMock: class extends Error {},
  InvalidDraftMock: class extends Error {},
}));

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/config/env", () => ({
  isCmsWriteEnabled: writesEnabledMock,
  isDocumentGenerationEnabled: generationEnabledMock,
}));
vi.mock("@/data/admin/documents", () => ({
  createAiContextVersion: createContextMock,
  publishPublicCvArtifact: vi.fn(),
}));
vi.mock("@/lib/documents/generate", () => ({
  DocumentSourceConflictError: SourceConflictMock,
  InvalidDocumentDraftError: InvalidDraftMock,
  generateApplicationDocuments: vi.fn(),
  generatePublicCvDraft: generatePublicMock,
  saveApplicationDocuments: saveApplicationMock,
  savePublicCvDraft: savePublicMock,
}));

import {
  type DocumentActionState,
  generatePublicCvAction,
  saveAiContextAction,
  saveApplicationDocumentsAction,
  savePublicCvDraftAction,
} from "./actions";

const initialDocumentState: DocumentActionState = { status: "idle" };

describe("document actions", () => {
  beforeEach(() => {
    requireAdminMock.mockReset().mockResolvedValue({ githubId: "1" });
    writesEnabledMock.mockReset().mockReturnValue(true);
    generationEnabledMock.mockReset().mockReturnValue(true);
    createContextMock.mockReset().mockResolvedValue({ id: "context" });
    generatePublicMock.mockReset();
    savePublicMock.mockReset().mockResolvedValue({ id: "artifact" });
    saveApplicationMock.mockReset().mockResolvedValue({ id: "application" });
  });

  it("saves professional context without optional personal context", async () => {
    const data = new FormData();
    data.set(
      "professionalContext",
      "Professional context with enough grounded detail for document generation.",
    );
    data.set("personalContext", "");

    await expect(saveAiContextAction(initialDocumentState, data)).resolves.toEqual({
      status: "success",
    });
    expect(createContextMock).toHaveBeenCalledWith(
      "Professional context with enough grounded detail for document generation.",
      "",
    );
  });

  it("fails closed before invoking AI when writes are disabled", async () => {
    writesEnabledMock.mockReturnValue(false);
    const data = new FormData();
    data.set("locale", "es");
    await expect(generatePublicCvAction(initialDocumentState, data)).resolves.toEqual({
      status: "disabled",
    });
    expect(generatePublicMock).not.toHaveBeenCalled();
  });

  it("requires the dedicated generation flag", async () => {
    generationEnabledMock.mockReturnValue(false);
    const data = new FormData();
    data.set("locale", "es");
    await expect(generatePublicCvAction(initialDocumentState, data)).resolves.toEqual({
      status: "unavailable",
    });
    expect(generatePublicMock).not.toHaveBeenCalled();
  });

  it("generates only after authorization and both gates pass", async () => {
    const draft = {
      draftId: "draft-1",
      locale: "en",
      sourceHash: "a".repeat(64),
      model: "test-model",
      proof: "d".repeat(64),
      content: { summary: "summary", experience: [], projects: [] },
      experienceLabels: [],
      projectLabels: [],
    };
    generatePublicMock.mockResolvedValue(draft);
    const data = new FormData();
    data.set("locale", "en");
    await expect(generatePublicCvAction(initialDocumentState, data)).resolves.toEqual({
      status: "generated",
      publicDraft: draft,
    });
    expect(requireAdminMock).toHaveBeenCalledOnce();
    expect(generatePublicMock).toHaveBeenCalledWith("en");
  });

  it("validates and saves an edited public CV draft", async () => {
    const data = new FormData();
    data.set("draftId", "2eb66473-aca8-4f1f-a312-9a697b75a2e3");
    data.set("locale", "es");
    data.set("sourceHash", "b".repeat(64));
    data.set("model", "test-model");
    data.set("proof", "d".repeat(64));
    data.set("summary", "S".repeat(80));
    data.append("experienceSlug", "developer");
    data.append("experienceDescription", "E".repeat(40));
    data.append("projectSlug", "portfolio");
    data.append("projectSummary", "P".repeat(30));

    await expect(savePublicCvDraftAction(initialDocumentState, data)).resolves.toEqual({
      status: "success",
    });
    expect(savePublicMock).toHaveBeenCalledWith({
      draftId: "2eb66473-aca8-4f1f-a312-9a697b75a2e3",
      locale: "es",
      sourceHash: "b".repeat(64),
      model: "test-model",
      proof: "d".repeat(64),
      content: {
        summary: "S".repeat(80),
        experience: [{ slug: "developer", description: "E".repeat(40) }],
        projects: [{ slug: "portfolio", summary: "P".repeat(30) }],
      },
    });
  });

  it("does not save a draft when document generation is disabled", async () => {
    generationEnabledMock.mockReturnValue(false);

    await expect(
      savePublicCvDraftAction(initialDocumentState, new FormData()),
    ).resolves.toEqual({ status: "unavailable" });
    expect(savePublicMock).not.toHaveBeenCalled();
  });

  it("reports a source conflict without persisting the public draft", async () => {
    savePublicMock.mockRejectedValue(new SourceConflictMock());
    const data = new FormData();
    data.set("draftId", "2eb66473-aca8-4f1f-a312-9a697b75a2e3");
    data.set("locale", "es");
    data.set("sourceHash", "b".repeat(64));
    data.set("model", "test-model");
    data.set("proof", "d".repeat(64));
    data.set("summary", "S".repeat(80));

    await expect(savePublicCvDraftAction(initialDocumentState, data)).resolves.toEqual({
      status: "conflict",
    });
  });

  it("validates and saves edited ATS and cover-letter drafts together", async () => {
    const data = new FormData();
    data.set("draftId", "2eb66473-aca8-4f1f-a312-9a697b75a2e3");
    data.set("locale", "en");
    data.set("sourceHash", "c".repeat(64));
    data.set("model", "test-model");
    data.set("proof", "d".repeat(64));
    data.set("company", "Example Corp");
    data.set("role", "Platform Engineer");
    data.set("sourceUrl", "");
    data.set("jobDescription", "J".repeat(100));
    data.set("notes", "");
    data.set("headline", "Platform Engineer");
    data.set("summary", "S".repeat(50));
    data.append("skill", "typescript");
    data.append("experienceSlug", "developer");
    data.append("experienceBullets", "E".repeat(20));
    data.append("projectSlug", "portfolio");
    data.append("projectBullets", "P".repeat(20));
    data.set("subject", "Application for Platform Engineer");
    data.set("salutation", "Dear hiring team,");
    data.set("paragraphs", ["A".repeat(40), "B".repeat(40), "C".repeat(40)].join("\n\n"));
    data.set("closing", "Sincerely,");

    await expect(
      saveApplicationDocumentsAction(initialDocumentState, data),
    ).resolves.toEqual({ status: "success" });
    expect(saveApplicationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        draftId: "2eb66473-aca8-4f1f-a312-9a697b75a2e3",
        sourceHash: "c".repeat(64),
        model: "test-model",
        proof: "d".repeat(64),
        application: expect.objectContaining({
          locale: "en",
          company: "Example Corp",
          role: "Platform Engineer",
        }),
        ats: expect.objectContaining({ skills: ["typescript"] }),
        cover: expect.objectContaining({ paragraphs: ["A".repeat(40), "B".repeat(40), "C".repeat(40)] }),
      }),
    );
  });
});
