import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdminMock,
  transactionMock,
  findUniqueMock,
  updateManyMock,
  contextFindFirstMock,
  artifactCountMock,
  artifactFindManyMock,
  artifactDeleteMock,
  applicationDeleteManyMock,
} = vi.hoisted(
  () => ({
    requireAdminMock: vi.fn(),
    transactionMock: vi.fn(),
    findUniqueMock: vi.fn(),
    updateManyMock: vi.fn(),
    contextFindFirstMock: vi.fn(),
    artifactCountMock: vi.fn(),
    artifactFindManyMock: vi.fn(),
    artifactDeleteMock: vi.fn(),
    applicationDeleteManyMock: vi.fn(),
  }),
);

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    $transaction: transactionMock,
    aiContext: { findFirst: contextFindFirstMock },
    documentArtifact: {
      count: artifactCountMock,
      findUnique: findUniqueMock,
      findMany: artifactFindManyMock,
      delete: artifactDeleteMock,
    },
    jobApplication: { deleteMany: applicationDeleteManyMock },
  }),
}));

import {
  createPublicCvDraft,
  deleteDocumentArtifact,
  getAdminDocumentWorkspace,
  publishPublicCvArtifact,
  saveAiContext,
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
    artifactDeleteMock.mockReset().mockResolvedValue({ id: "artifact" });
    applicationDeleteManyMock.mockReset().mockResolvedValue({ count: 1 });
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

  it("applies the same document filters to the count and page query", async () => {
    const filters = {
      kind: "ATS_CV" as const,
      locale: "EN" as const,
      status: "DRAFT" as const,
      query: "engineer",
    };

    await getAdminDocumentWorkspace(1, filters);

    expect(artifactCountMock).toHaveBeenCalledWith({ where: expect.any(Object) });
    expect(artifactFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          kind: "ATS_CV",
          locale: "EN",
          status: "DRAFT",
          OR: expect.any(Array),
        }),
      }),
    );
  });

  it("deletes an artifact and its application only when it becomes empty", async () => {
    findUniqueMock.mockResolvedValue({
      applicationId: "2eb66473-aca8-4f1f-a312-9a697b75a2e3",
      kind: "ATS_CV",
      status: "DRAFT",
    });
    transactionMock.mockImplementation((callback) =>
      callback({
        documentArtifact: { findUnique: findUniqueMock, delete: artifactDeleteMock },
        jobApplication: { deleteMany: applicationDeleteManyMock },
      }),
    );

    await expect(
      deleteDocumentArtifact("19781016-8a26-4483-93f4-9cd2c7208583", { status: "DRAFT", publishedAt: null }),
    ).resolves.toEqual({ kind: "ATS_CV", status: "DRAFT" });
    expect(applicationDeleteManyMock).toHaveBeenCalledWith({
      where: {
        id: "2eb66473-aca8-4f1f-a312-9a697b75a2e3",
        artifacts: { none: {} },
      },
    });
    expect(transactionMock).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: "Serializable" },
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

  it.each([
    { status: "PUBLISHED", publishedAt: new Date("2026-09-08T12:00:00.000Z") },
    { status: "ARCHIVED", publishedAt: new Date("2026-09-08T12:00:00.000Z") },
  ])("rejects stale draft deletion after publication: $status", async (artifact) => {
    findUniqueMock.mockResolvedValue({ kind: "PUBLIC_CV", applicationId: null, ...artifact });
    await expect(deleteDocumentArtifact("id", { status: "DRAFT", publishedAt: null })).resolves.toBeNull();
    expect(artifactDeleteMock).not.toHaveBeenCalled();
    expect(applicationDeleteManyMock).not.toHaveBeenCalled();
  });

  it("compares publication time even when the expected status matches", async () => {
    findUniqueMock.mockResolvedValue({ kind: "PUBLIC_CV", status: "PUBLISHED", publishedAt: new Date("2026-09-08T12:00:00.000Z") });
    await expect(deleteDocumentArtifact("id", { status: "PUBLISHED", publishedAt: "2026-09-07T12:00:00.000Z" })).resolves.toBeNull();
    expect(artifactDeleteMock).not.toHaveBeenCalled();
  });

  it("rechecks deletion expectations on a serialization retry", async () => {
    transactionMock.mockRejectedValueOnce({ code: "P2034" });
    findUniqueMock.mockResolvedValue({ kind: "PUBLIC_CV", status: "PUBLISHED", publishedAt: new Date() });
    await expect(deleteDocumentArtifact("id", { status: "DRAFT", publishedAt: null })).resolves.toBeNull();
    expect(transactionMock).toHaveBeenCalledTimes(2);
    expect(artifactDeleteMock).not.toHaveBeenCalled();
  });

  it("updates the current context in place without appending history", async () => {
    const update = vi.fn().mockResolvedValue({ id: "context" });
    const create = vi.fn();
    contextFindFirstMock.mockResolvedValue({ id: "context" });
    transactionMock.mockImplementation((callback) => callback({ aiContext: { findFirst: contextFindFirstMock, update, create } }));
    await expect(saveAiContext("professional", "personal")).resolves.toEqual({ id: "context" });
    expect(update).toHaveBeenCalledWith({ where: { id: "context" }, data: { professionalContext: "professional", personalContext: "personal", createdAt: expect.any(Date) }, select: { id: true } });
    expect(create).not.toHaveBeenCalled();
  });

  it("creates the initial context with bounded serializable retries", async () => {
    const create = vi.fn().mockResolvedValue({ id: "context" });
    transactionMock.mockRejectedValueOnce({ code: "P2034" }).mockImplementation((callback) => callback({ aiContext: { findFirst: contextFindFirstMock, create } }));
    await expect(saveAiContext("professional", "")).resolves.toEqual({ id: "context" });
    expect(create).toHaveBeenCalledOnce();
    expect(transactionMock).toHaveBeenCalledTimes(2);
  });

  it("creates public artifacts without allocating a counter", async () => {
    findUniqueMock.mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue({ id: "draft" });
    transactionMock.mockImplementation((callback) => callback({ documentArtifact: { create } }));
    await createPublicCvDraft({ id: "draft", locale: "ES", title: "CV", content: {}, sourceHash: "hash", model: "model" });
    expect(create.mock.calls[0][0].data).not.toHaveProperty("version");
  });
});
