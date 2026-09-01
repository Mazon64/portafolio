import { describe, expect, it } from "vitest";
import { categorySchema, skillSchema } from "./skills-schema";

describe("skills schemas", () => {
  it("requires complete category translations", () => {
    expect(categorySchema.safeParse({ id: "", updatedAt: "", slug: "backend", presentation: "BADGES", order: "0", esTitle: "Backend", esDescription: "Descripción", enTitle: "Backend", enDescription: "Description" }).success).toBe(true);
  });
  it("requires a valid category for a skill", () => {
    expect(skillSchema.safeParse({ id: "", updatedAt: "", categoryId: "bad", slug: "nodejs", iconKey: "nodejs", order: "0", esName: "Node.js", enName: "Node.js" }).success).toBe(false);
  });
});
