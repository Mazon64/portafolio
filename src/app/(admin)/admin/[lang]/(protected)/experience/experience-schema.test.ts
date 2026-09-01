import { describe, expect, it } from "vitest";

import { experienceSchema } from "./experience-schema";

const valid = {
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
};

describe("experience schema", () => {
  it("accepts complete bilingual content", () => {
    expect(experienceSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid date ranges and partial versions", () => {
    expect(
      experienceSchema.safeParse({ ...valid, endDate: "2024-01-01" }).success,
    ).toBe(false);
    expect(
      experienceSchema.safeParse({
        ...valid,
        id: "2eb66473-aca8-4f1f-a312-9a697b75a2e3",
      }).success,
    ).toBe(false);
  });
});
