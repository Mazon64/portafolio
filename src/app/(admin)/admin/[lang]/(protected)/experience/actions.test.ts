import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminMock, saveMock, deleteMock, updateTagMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  saveMock: vi.fn(),
  deleteMock: vi.fn(),
  updateTagMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ updateTag: updateTagMock }));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/data/admin/experience", () => ({
  saveAdminExperience: saveMock,
  deleteAdminExperience: deleteMock,
}));

import { initialDeleteState } from "@/components/admin/delete-form";
import {
  deleteExperienceAction,
  initialExperienceState,
  saveExperienceAction,
} from "./actions";

function formData() {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    id: "",
    updatedAt: "",
    slug: "software-engineer",
    company: "Example",
    startDate: "2025-01",
    endDate: "",
    isCurrent: "on",
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
    deleteMock.mockReset().mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("authorizes, saves both locales, and invalidates public content", async () => {
    await expect(
      saveExperienceAction(initialExperienceState, formData()),
    ).resolves.toEqual({
      status: "success",
      id: "2eb66473-aca8-4f1f-a312-9a697b75a2e3",
      updatedAt: "2026-08-31T20:00:00.000Z",
    });
    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        es: { role: "Ingeniero", description: "Descripción" },
        en: { role: "Engineer", description: "Description" },
        isCurrent: true,
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

  it("preserves the committed version when cache invalidation fails", async () => {
    updateTagMock.mockImplementation(() => {
      throw new Error("Cache unavailable");
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      saveExperienceAction(initialExperienceState, formData()),
    ).resolves.toEqual({
      status: "cache-error",
      id: "2eb66473-aca8-4f1f-a312-9a697b75a2e3",
      updatedAt: "2026-08-31T20:00:00.000Z",
    });
  });

  it("returns an explicit delete conflict", async () => {
    deleteMock.mockResolvedValue(false);
    const data = new FormData();
    data.set("id", "2eb66473-aca8-4f1f-a312-9a697b75a2e3");
    data.set("updatedAt", "2026-08-31T20:00:00.000Z");

    await expect(
      deleteExperienceAction(initialDeleteState, data),
    ).resolves.toEqual({ status: "conflict" });
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it("returns an explicit error when delete persistence fails", async () => {
    deleteMock.mockRejectedValue(new Error("Database unavailable"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const data = new FormData();
    data.set("id", "2eb66473-aca8-4f1f-a312-9a697b75a2e3");
    data.set("updatedAt", "2026-08-31T20:00:00.000Z");

    await expect(
      deleteExperienceAction(initialDeleteState, data),
    ).resolves.toEqual({ status: "error" });
    expect(updateTagMock).not.toHaveBeenCalled();
  });
});
