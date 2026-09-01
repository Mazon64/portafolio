import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { updateTagMock, requireAdminMock, updateAdminProfileMock } = vi.hoisted(
  () => ({
    updateTagMock: vi.fn(),
    requireAdminMock: vi.fn(),
    updateAdminProfileMock: vi.fn(),
  }),
);

vi.mock("next/cache", () => ({ updateTag: updateTagMock }));
vi.mock("@/lib/auth/authorization", () => ({
  requireAdmin: requireAdminMock,
}));
vi.mock("@/data/admin/profile", () => ({
  updateAdminProfile: updateAdminProfileMock,
}));

import { updateProfileAction } from "./actions";
import { initialProfileFormState } from "./profile-form-state";

function validFormData() {
  const formData = new FormData();
  const fields = {
    uiLocale: "en",
    updatedAt: "2026-08-31T20:00:00.000Z",
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    esTitle: "Ingeniera",
    esLongBio: "Biografía profesional",
    esContactText: "Hablemos",
    enTitle: "Engineer",
    enLongBio: "Professional biography",
    enContactText: "Let's talk",
  };
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

describe("profile update action", () => {
  beforeEach(() => {
    updateTagMock.mockReset();
    requireAdminMock.mockReset();
    updateAdminProfileMock.mockReset();
    requireAdminMock.mockResolvedValue({ name: "Ada" });
    updateAdminProfileMock.mockResolvedValue("2026-08-31T20:01:00.000Z");
    vi.stubEnv("CMS_WRITES_ENABLED", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects unauthorized mutations before processing data", async () => {
    requireAdminMock.mockRejectedValue(new Error("Unauthorized"));

    await expect(
      updateProfileAction(initialProfileFormState, validFormData()),
    ).resolves.toEqual({ status: "error" });
    expect(updateAdminProfileMock).not.toHaveBeenCalled();
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it("fails closed when writes are disabled", async () => {
    vi.stubEnv("CMS_WRITES_ENABLED", "false");

    await expect(
      updateProfileAction(initialProfileFormState, validFormData()),
    ).resolves.toEqual({ status: "disabled" });
    expect(updateAdminProfileMock).not.toHaveBeenCalled();
  });

  it("returns localized field errors without writing", async () => {
    const formData = validFormData();
    formData.set("uiLocale", "es");
    formData.set("enTitle", "");

    const state = await updateProfileAction(initialProfileFormState, formData);

    expect(state.status).toBe("invalid");
    expect(state.errors?.enTitle).toEqual(["Este campo es obligatorio."]);
    expect(updateAdminProfileMock).not.toHaveBeenCalled();
  });

  it("invalidates public content only after a successful write", async () => {
    await expect(
      updateProfileAction(initialProfileFormState, validFormData()),
    ).resolves.toEqual({
      status: "success",
      updatedAt: "2026-08-31T20:01:00.000Z",
    });
    expect(updateAdminProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: "Ada Lovelace",
        updatedAt: "2026-08-31T20:00:00.000Z",
        es: expect.objectContaining({ title: "Ingeniera" }),
        en: expect.objectContaining({ title: "Engineer" }),
      }),
    );
    expect(updateTagMock).toHaveBeenCalledWith("portfolio");
    expect(updateAdminProfileMock.mock.invocationCallOrder[0]).toBeLessThan(
      updateTagMock.mock.invocationCallOrder[0],
    );
  });

  it("does not invalidate the cache when persistence fails", async () => {
    updateAdminProfileMock.mockRejectedValue(new Error("Database unavailable"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      updateProfileAction(initialProfileFormState, validFormData()),
    ).resolves.toEqual({ status: "error" });
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it("reports a concurrent edit without invalidating the cache", async () => {
    updateAdminProfileMock.mockResolvedValue(null);

    await expect(
      updateProfileAction(initialProfileFormState, validFormData()),
    ).resolves.toEqual({ status: "conflict" });
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it("reports a cache failure without claiming the committed write failed", async () => {
    updateTagMock.mockImplementation(() => {
      throw new Error("Cache unavailable");
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      updateProfileAction(initialProfileFormState, validFormData()),
    ).resolves.toEqual({
      status: "cache-error",
      updatedAt: "2026-08-31T20:01:00.000Z",
    });
  });

  it("preserves the committed version across a later persistence error", async () => {
    updateAdminProfileMock.mockRejectedValue(new Error("Database unavailable"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      updateProfileAction(
        {
          status: "cache-error",
          updatedAt: "2026-08-31T20:01:00.000Z",
        },
        validFormData(),
      ),
    ).resolves.toEqual({
      status: "error",
      updatedAt: "2026-08-31T20:01:00.000Z",
    });
  });
});
