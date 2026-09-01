import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminMock, getPrismaMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getPrismaMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/authorization", () => ({
  requireAdmin: requireAdminMock,
}));
vi.mock("@/lib/prisma", () => ({ getPrisma: getPrismaMock }));
vi.mock("@/generated/prisma/client", () => ({
  Locale: { ES: "ES", EN: "EN" },
}));

import { updateAdminProfile } from "./profile";

const input = {
  updatedAt: "2026-08-31T20:00:00.000Z",
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  es: {
    title: "Ingeniera",
    longBio: "Biografía",
    contactText: "Contacto",
  },
  en: {
    title: "Engineer",
    longBio: "Biography",
    contactText: "Contact",
  },
};

describe("admin profile DAL", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getPrismaMock.mockReset();
    requireAdminMock.mockResolvedValue({ name: "Ada" });
  });

  it("updates shared fields and both translations in one transaction", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findUniqueOrThrow = vi.fn().mockResolvedValue({
      id: "profile-id",
      updatedAt: new Date("2026-08-31T20:01:00.000Z"),
    });
    const upsert = vi.fn().mockResolvedValue({});
    const transaction = vi.fn(async (operation) =>
      operation({
        profile: { updateMany, findUniqueOrThrow },
        profileTranslation: { upsert },
      }),
    );
    getPrismaMock.mockReturnValue({ $transaction: transaction });

    await expect(updateAdminProfile(input)).resolves.toBe(
      "2026-08-31T20:01:00.000Z",
    );

    expect(requireAdminMock).toHaveBeenCalledOnce();
    expect(transaction).toHaveBeenCalledOnce();
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: "main-profile",
          updatedAt: new Date(input.updatedAt),
        },
        data: { fullName: "Ada Lovelace", email: "ada@example.com" },
      }),
    );
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          profileId_locale: { profileId: "profile-id", locale: "ES" },
        },
        update: input.es,
      }),
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          profileId_locale: { profileId: "profile-id", locale: "EN" },
        },
        update: input.en,
      }),
    );
  });

  it("does not overwrite a profile changed by another editor", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const findUniqueOrThrow = vi.fn();
    const upsert = vi.fn();
    const transaction = vi.fn(async (operation) =>
      operation({
        profile: { updateMany, findUniqueOrThrow },
        profileTranslation: { upsert },
      }),
    );
    getPrismaMock.mockReturnValue({ $transaction: transaction });

    await expect(updateAdminProfile(input)).resolves.toBeNull();
    expect(findUniqueOrThrow).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });
});
