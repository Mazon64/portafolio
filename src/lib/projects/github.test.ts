import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { chunkSource, getProjectSources, getRepository } from "./github";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const repository = { id: 42, full_name: "owner/repo", private: false, default_branch: "main" };

describe("GitHub project ingestion", () => {
  it("does not admit private repositories even with a valid token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...repository, private: true })));
    await expect(getRepository("42")).rejects.toThrow("must be public");
  });
  it("reads only allowed paths at the supplied commit and pins source citations", async () => {
    const sha = "a".repeat(40);
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ type: "file", encoding: "base64", content: Buffer.from("Grounded project documentation").toString("base64"), size: 30 }));
    vi.stubGlobal("fetch", fetchMock);
    const chunks = await getProjectSources(repository, sha, ["docs/architecture.md"]);
    expect(fetchMock.mock.calls[0][0]).toBe(`https://api.github.com/repos/owner/repo/contents/docs/architecture.md?ref=${sha}`);
    expect(chunks[0].sourceUrl).toBe(`https://github.com/owner/repo/blob/${sha}/docs/architecture.md`);
    expect(chunks[0].content).toBe("Grounded project documentation");
  });
  it("rejects oversized sources without silently truncating them", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ type: "file", encoding: "base64", content: "", size: 120001 })));
    await expect(getProjectSources(repository, "a".repeat(40), ["README.md"])).rejects.toThrow();
  });
  it("reuses chunk hashes across commits when content is unchanged", () => {
    const first = chunkSource("README.md", "x".repeat(3000), "owner/repo", "a".repeat(40));
    const second = chunkSource("README.md", "x".repeat(3000), "owner/repo", "b".repeat(40));
    expect(first).toHaveLength(2);
    expect(first.map((c) => c.sourceHash)).toEqual(second.map((c) => c.sourceHash));
    expect(first[0].sourceUrl).not.toBe(second[0].sourceUrl);
  });
});
