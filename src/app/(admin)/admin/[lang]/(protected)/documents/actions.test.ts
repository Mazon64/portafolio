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
  deleteArtifactMock,
  revalidatePathMock,
  updateTagMock,
  publishMock,
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
  deleteArtifactMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  updateTagMock: vi.fn(),
  publishMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  updateTag: updateTagMock,
}));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/config/env", () => ({
  isCmsWriteEnabled: writesEnabledMock,
  isDocumentGenerationEnabled: generationEnabledMock,
}));
vi.mock("@/data/admin/documents", () => ({
  saveAiContext: createContextMock,
  deleteDocumentArtifact: deleteArtifactMock,
  publishPublicCvArtifact: publishMock,
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
  deleteDocumentArtifactAction,
  generatePublicCvAction,
  saveAiContextAction,
  saveApplicationDocumentsAction,
  savePublicCvDraftAction,
  publishPublicCvAction,
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
    deleteArtifactMock.mockReset().mockResolvedValue({ kind: "ATS_CV", status: "DRAFT" });
    revalidatePathMock.mockReset();
    updateTagMock.mockReset();
    publishMock.mockReset().mockResolvedValue(true);
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

  it("deletes a validated document and refreshes its localized workspace", async () => {
    const data = new FormData();
    data.set("id", "2eb66473-aca8-4f1f-a312-9a697b75a2e3");
    data.set("locale", "en");
    data.set("confirmation", "delete");
    data.set("expectedStatus", "DRAFT");
    data.set("expectedPublishedAt", "");

    await expect(
      deleteDocumentArtifactAction({ status: "idle" }, data),
    ).resolves.toEqual({ status: "deleted" });
    expect(deleteArtifactMock).toHaveBeenCalledWith(
      "2eb66473-aca8-4f1f-a312-9a697b75a2e3",
      { status: "DRAFT", publishedAt: null },
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/en/documents");
  });

  it("invalidates the public CV after deleting the published artifact", async () => {
    deleteArtifactMock.mockResolvedValue({ kind: "PUBLIC_CV", status: "PUBLISHED" });
    const data = new FormData();
    data.set("id", "2eb66473-aca8-4f1f-a312-9a697b75a2e3");
    data.set("locale", "es");
    data.set("confirmation", "delete");
    data.set("expectedStatus", "PUBLISHED");
    data.set("expectedPublishedAt", "2026-09-08T12:00:00.000Z");

    await deleteDocumentArtifactAction({ status: "idle" }, data);

    expect(updateTagMock).toHaveBeenCalledWith("portfolio");
  });

  it("still invalidates a deleted public CV when refreshing the workspace fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    deleteArtifactMock.mockResolvedValue({ kind: "PUBLIC_CV", status: "PUBLISHED" });
    revalidatePathMock.mockImplementation(() => {
      throw new Error("cache unavailable");
    });
    const data = new FormData();
    data.set("id", "2eb66473-aca8-4f1f-a312-9a697b75a2e3");
    data.set("locale", "es");
    data.set("confirmation", "delete");
    data.set("expectedStatus", "PUBLISHED");
    data.set("expectedPublishedAt", "2026-09-08T12:00:00.000Z");

    await expect(
      deleteDocumentArtifactAction({ status: "idle" }, data),
    ).resolves.toEqual({ status: "cache-error" });
    expect(updateTagMock).toHaveBeenCalledWith("portfolio");
    consoleError.mockRestore();
  });

  it("does not delete documents when writes are disabled", async () => {
    writesEnabledMock.mockReturnValue(false);

    await expect(
      deleteDocumentArtifactAction({ status: "idle" }, new FormData()),
    ).resolves.toEqual({ status: "disabled" });
    expect(deleteArtifactMock).not.toHaveBeenCalled();
  });

  it("rejects deletion without the expected-state token", async () => {
    const data = new FormData();
    data.set("id", "2eb66473-aca8-4f1f-a312-9a697b75a2e3");
    data.set("locale", "en");
    data.set("confirmation", "delete");
    await expect(deleteDocumentArtifactAction({ status: "idle" }, data)).resolves.toEqual({ status: "conflict" });
    expect(deleteArtifactMock).not.toHaveBeenCalled();
  });

  it("refreshes both workspaces and public cache only after publication commits", async () => {
    const data = new FormData();
    data.set("id", "2eb66473-aca8-4f1f-a312-9a697b75a2e3");
    await expect(publishPublicCvAction(initialDocumentState, data)).resolves.toEqual({ status: "success" });
    expect(updateTagMock).toHaveBeenCalledWith("portfolio");
    expect(publishMock.mock.invocationCallOrder[0]).toBeLessThan(updateTagMock.mock.invocationCallOrder[0]);
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/es/documents", "layout");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/en/documents", "layout");
  });

  it("reports committed publication even if public invalidation fails, and still refreshes admin", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    updateTagMock.mockImplementation(() => { throw new Error("cache failed"); });
    const data = new FormData();
    data.set("id", "2eb66473-aca8-4f1f-a312-9a697b75a2e3");
    await expect(publishPublicCvAction(initialDocumentState, data)).resolves.toEqual({ status: "cache-error" });
    expect(revalidatePathMock).toHaveBeenCalledTimes(2);
    log.mockRestore();
  });

  it("does not invalidate after a publication conflict", async () => {
    publishMock.mockResolvedValue(false);
    const data = new FormData();
    data.set("id", "2eb66473-aca8-4f1f-a312-9a697b75a2e3");
    await expect(publishPublicCvAction(initialDocumentState, data)).resolves.toEqual({ status: "invalid" });
    expect(updateTagMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("distinguishes context commit from refresh failure", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    revalidatePathMock.mockImplementation(() => { throw new Error("cache failed"); });
    const data = new FormData();
    data.set("professionalContext", "P".repeat(80));
    data.set("personalContext", "");
    await expect(saveAiContextAction(initialDocumentState, data)).resolves.toEqual({ status: "cache-error" });
    expect(createContextMock).toHaveBeenCalledOnce();
    expect(revalidatePathMock).toHaveBeenCalledTimes(2);
    expect(updateTagMock).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
