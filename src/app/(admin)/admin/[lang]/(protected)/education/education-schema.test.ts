import { describe, expect, it } from "vitest";

import { educationSchema } from "./education-schema";

const valid = {
  id: "",
  updatedAt: "",
  slug: "software-engineering",
  institution: "University",
  startDate: "2020-01",
  endDate: "2024-01",
  isCurrent: false,
  order: "0",
  esDegree: "Ingeniería de software",
  enDegree: "Software Engineering",
};

describe("education schema", () => {
  it("accepts complete bilingual education", () => {
    expect(educationSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    expect(educationSchema.safeParse({ ...valid, endDate: "2019-01" }).success).toBe(false);
  });

  it("accepts a current record without an end month", () => {
    expect(educationSchema.safeParse({ ...valid, endDate: "", isCurrent: true }).success).toBe(true);
  });
});
