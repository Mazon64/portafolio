import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdminMock,
  writesEnabledMock,
  generationEnabledMock,
  generatePublicMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  writesEnabledMock: vi.fn(),
  generationEnabledMock: vi.fn(),
  generatePublicMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/config/env", () => ({
  isCmsWriteEnabled: writesEnabledMock,
  isDocumentGenerationEnabled: generationEnabledMock,
}));
vi.mock("@/data/admin/documents", () => ({
  createAiContextVersion: vi.fn(),
  publishPublicCvArtifact: vi.fn(),
}));
vi.mock("@/lib/documents/generate", () => ({
  generateApplicationDocuments: vi.fn(),
  generatePublicCvDraft: generatePublicMock,
}));

import { generatePublicCvAction, initialDocumentState } from "./actions";

describe("document actions", () => {
  beforeEach(() => {
    requireAdminMock.mockReset().mockResolvedValue({ githubId: "1" });
    writesEnabledMock.mockReset().mockReturnValue(true);
    generationEnabledMock.mockReset().mockReturnValue(true);
    generatePublicMock.mockReset().mockResolvedValue({ id: "artifact" });
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
    const data = new FormData();
    data.set("locale", "en");
    await expect(generatePublicCvAction(initialDocumentState, data)).resolves.toEqual({
      status: "success",
    });
    expect(requireAdminMock).toHaveBeenCalledOnce();
    expect(generatePublicMock).toHaveBeenCalledWith("en");
  });
});
