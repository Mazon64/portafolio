import { describe, expect, it } from "vitest";

import { createProfileSchema } from "./profile-schema";

const validProfile = {
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

describe("profile schema", () => {
  it("normalizes valid bilingual content", () => {
    expect(
      createProfileSchema("en").parse({
        ...validProfile,
        fullName: "  Ada Lovelace  ",
        email: "  ada@example.com ",
      }),
    ).toMatchObject({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
    });
  });

  it("requires every translation", () => {
    const result = createProfileSchema("es").safeParse({
      ...validProfile,
      enLongBio: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.enLongBio).toEqual([
        "Este campo es obligatorio.",
      ]);
    }
  });

  it("allows an empty public email but rejects malformed values", () => {
    expect(
      createProfileSchema("en").safeParse({ ...validProfile, email: "" })
        .success,
    ).toBe(true);
    expect(
      createProfileSchema("en").safeParse({ ...validProfile, email: "bad" })
        .success,
    ).toBe(false);
  });
});
