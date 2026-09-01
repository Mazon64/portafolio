import { describe, expect, it } from "vitest";

import { educationSchema } from "./education-schema";

const valid = {
  id: "",
  updatedAt: "",
  slug: "software-engineering",
  institution: "University",
  startDate: "2020-01-01",
  endDate: "2024-01-01",
  order: "0",
  esDegree: "Ingeniería de software",
  enDegree: "Software Engineering",
};

describe("education schema", () => {
  it("accepts complete bilingual education", () => {
    expect(educationSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    expect(educationSchema.safeParse({ ...valid, endDate: "2019-01-01" }).success).toBe(false);
  });
});
