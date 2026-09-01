import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminMock, saveMock, updateTagMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  saveMock: vi.fn(),
  updateTagMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ updateTag: updateTagMock }));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/data/admin/experience", () => ({
  saveAdminExperience: saveMock,
  deleteAdminExperience: vi.fn(),
}));

import { initialExperienceState, saveExperienceAction } from "./actions";

function formData() {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    id: "",
    updatedAt: "",
    slug: "software-engineer",
    company: "Example",
    startDate: "2025-01-01",
    endDate: "",
    order: "0",
    esRole: "Ingeniero",
    esDescription: "Descripción",
    enRole: "Engineer",
    enDescription: "Description",
    showOnPortfolio: "on",
    showOnCv: "on",
  })) data.set(key, value);
  return data;
}

describe("experience actions", () => {
  beforeEach(() => {
    vi.stubEnv("CMS_WRITES_ENABLED", "true");
    requireAdminMock.mockReset().mockResolvedValue({ name: "Admin" });
    saveMock.mockReset().mockResolvedValue({
      id: "2eb66473-aca8-4f1f-a312-9a697b75a2e3",
      updatedAt: "2026-08-31T20:00:00.000Z",
    });
    updateTagMock.mockReset();
  });

  it("authorizes, saves both locales, and invalidates public content", async () => {
    await expect(
      saveExperienceAction(initialExperienceState, formData()),
    ).resolves.toEqual({ status: "success" });
    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        es: { role: "Ingeniero", description: "Descripción" },
        en: { role: "Engineer", description: "Description" },
      }),
    );
    expect(updateTagMock).toHaveBeenCalledWith("portfolio");
  });

  it("fails closed when writes are disabled", async () => {
    vi.stubEnv("CMS_WRITES_ENABLED", "false");
    await expect(
      saveExperienceAction(initialExperienceState, formData()),
    ).resolves.toEqual({ status: "disabled" });
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("distinguishes an optimistic concurrency conflict", async () => {
    saveMock.mockResolvedValue(null);
    await expect(
      saveExperienceAction(initialExperienceState, formData()),
    ).resolves.toEqual({ status: "conflict" });
    expect(updateTagMock).not.toHaveBeenCalled();
  });
});
