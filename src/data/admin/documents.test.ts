import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminMock, transactionMock, findUniqueMock, updateManyMock } = vi.hoisted(
  () => ({
    requireAdminMock: vi.fn(),
    transactionMock: vi.fn(),
    findUniqueMock: vi.fn(),
    updateManyMock: vi.fn(),
  }),
);

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({ $transaction: transactionMock }),
}));

import { publishPublicCvArtifact } from "./documents";

describe("document publication", () => {
  beforeEach(() => {
    requireAdminMock.mockReset().mockResolvedValue({ githubId: "1" });
    findUniqueMock.mockReset().mockResolvedValue({
      kind: "PUBLIC_CV",
      locale: "ES",
      status: "DRAFT",
    });
    updateManyMock.mockReset();
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
});
