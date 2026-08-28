import { describe, expect, it } from "vitest";

import { hasSkillIcon } from "./skill-icons";

describe("skill icon registry", () => {
  it.each([
    "javascript",
    "nodejs",
    "expressjs",
    "mysql",
    "vuejs",
    "react",
    "ionic",
    "docker",
    "workflow",
    "git",
    "github",
  ])("resolves the seeded key %s", (iconKey) => {
    expect(hasSkillIcon(iconKey)).toBe(true);
  });

  it("rejects missing or unknown keys", () => {
    expect(hasSkillIcon(null)).toBe(false);
    expect(hasSkillIcon("unknown")).toBe(false);
  });
});
