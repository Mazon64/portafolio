import { describe, expect, it } from "vitest";

import { createSourceHash } from "./source-hash";

describe("document source hashes", () => {
  it("is deterministic and changes with source content", () => {
    expect(createSourceHash({ value: "one" })).toBe(createSourceHash({ value: "one" }));
    expect(createSourceHash({ value: "one" })).not.toBe(createSourceHash({ value: "two" }));
  });
});
