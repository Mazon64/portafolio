import { describe, expect, it, vi } from "vitest";

const { findFirstMock } = vi.hoisted(() => ({ findFirstMock: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({ documentArtifact: { findFirst: findFirstMock } }),
}));

import { getPublishedGeneratedCv } from "./generated-documents";

describe("published generated CV data", () => {
  it("falls back safely before the expand migration is applied", async () => {
    findFirstMock.mockRejectedValueOnce({ code: "P2021" });
    await expect(getPublishedGeneratedCv("es")).resolves.toBeNull();
  });

  it("does not hide unexpected database failures", async () => {
    findFirstMock.mockRejectedValueOnce(new Error("Connection failed"));
    await expect(getPublishedGeneratedCv("en")).rejects.toThrow("Connection failed");
  });
});
