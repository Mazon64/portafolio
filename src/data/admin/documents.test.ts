import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdminMock,
  transactionMock,
  findUniqueMock,
  updateManyMock,
  contextFindFirstMock,
  artifactCountMock,
  artifactFindManyMock,
} = vi.hoisted(
  () => ({
    requireAdminMock: vi.fn(),
    transactionMock: vi.fn(),
    findUniqueMock: vi.fn(),
    updateManyMock: vi.fn(),
    contextFindFirstMock: vi.fn(),
    artifactCountMock: vi.fn(),
    artifactFindManyMock: vi.fn(),
  }),
);

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    $transaction: transactionMock,
    aiContextVersion: { findFirst: contextFindFirstMock },
    documentArtifact: {
      count: artifactCountMock,
      findUnique: findUniqueMock,
      findMany: artifactFindManyMock,
    },
  }),
}));

import {
  createPublicCvDraft,
  getAdminDocumentWorkspace,
  publishPublicCvArtifact,
} from "./documents";

describe("document publication", () => {
  beforeEach(() => {
    requireAdminMock.mockReset().mockResolvedValue({ githubId: "1" });
    findUniqueMock.mockReset().mockResolvedValue({
      kind: "PUBLIC_CV",
      locale: "ES",
      status: "DRAFT",
    });
    updateManyMock.mockReset();
    contextFindFirstMock.mockReset().mockResolvedValue(null);
    artifactCountMock.mockReset().mockResolvedValue(0);
    artifactFindManyMock.mockReset().mockResolvedValue([]);
    transactionMock.mockReset().mockImplementation((callback) =>
      callback({
        documentArtifact: {
          findUnique: findUniqueMock,
          updateMany: updateManyMock,
        },
      }),
    );
  });

  it("throws to roll back archival when the draft changes concurrently", async () => {
    updateManyMock.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    await expect(
      publishPublicCvArtifact("2eb66473-aca8-4f1f-a312-9a697b75a2e3"),
    ).rejects.toThrow("changed during publication");
  });

  it("publishes a draft after archiving the previous public version", async () => {
    updateManyMock.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
    await expect(
      publishPublicCvArtifact("2eb66473-aca8-4f1f-a312-9a697b75a2e3"),
    ).resolves.toBe(true);
    expect(updateManyMock).toHaveBeenCalledTimes(2);
  });

  it("paginates the permanent artifact history", async () => {
    artifactCountMock.mockResolvedValue(8);

    await expect(getAdminDocumentWorkspace(2)).resolves.toMatchObject({
      history: { page: 2, totalPages: 2, totalItems: 8 },
      artifacts: [],
    });
    expect(artifactFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: 6,
        take: 6,
      }),
    );
  });

  it("treats a repeated public draft identifier as an idempotent save", async () => {
    const id = "2eb66473-aca8-4f1f-a312-9a697b75a2e3";
    findUniqueMock.mockResolvedValue({
      id,
      kind: "PUBLIC_CV",
      locale: "ES",
      sourceHash: "a".repeat(64),
      model: "test-model",
    });

    await expect(
      createPublicCvDraft({
        id,
        locale: "ES",
        title: "CV público",
        content: {},
        sourceHash: "a".repeat(64),
        model: "test-model",
      }),
    ).resolves.toEqual({ id });
    expect(transactionMock).not.toHaveBeenCalled();
  });
});
