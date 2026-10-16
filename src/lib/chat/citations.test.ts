import { describe, expect, it } from "vitest";
import { chatCitations } from "./citations";

describe("visible chat evidence", () => {
  it("hides internal grounding links while retaining and deduplicating real documentary citations", () => {
    const source = { title: "Source", url: "https://example.com" };
    expect(chatCitations([
      { ...source, id: "person:experience" }, { ...source, id: "site:chat" }, { ...source, id: "project:portfolio" },
      { ...source, id: "action:cv", action: "cv" },
      { ...source, id: "chunk:first" }, { ...source, id: "chunk:duplicate" },
    ])).toEqual([{ ...source, id: "chunk:first" }]);
    expect(chatCitations([{ ...source, id: "site:chat" }])).toEqual([]);
  });
});
