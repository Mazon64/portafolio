import { afterEach, describe, expect, it, vi } from "vitest";
const { generate, attempts } = vi.hoisted(() => ({ generate: vi.fn(), attempts: vi.fn(() => ["test-key-a", "test-key-b"]) }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/documents/gemini", () => ({ generateStructuredDocument: generate, getApiKeyAttempts: attempts }));
import { answerProjectQuestion, embedTexts, vectorLiteral } from "./ai";
afterEach(() => { vi.unstubAllGlobals(); generate.mockReset(); });

describe("project embeddings and grounded answers", () => {
  it("rejects nonfinite, zero and incompatible vectors", () => {
    expect(() => vectorLiteral([1, 2])).toThrow();
    expect(() => vectorLiteral(Array(768).fill(0))).toThrow();
    expect(() => vectorLiteral(Array(768).fill(Infinity))).toThrow();
    expect(() => vectorLiteral(Array(768).fill(1e308))).toThrow();
  });
  it("normalizes vectors and uses the retrieval task and fixed dimensions", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ embeddings: [{ values: Array(768).fill(1) }] }));
    vi.stubGlobal("fetch", fetchMock);
    const [vector] = await embedTexts(["Query"], "RETRIEVAL_QUERY");
    expect(Math.sqrt((JSON.parse(vector) as number[]).reduce((sum, n) => sum + n * n, 0))).toBeCloseTo(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.requests[0]).toMatchObject({ taskType: "RETRIEVAL_QUERY", outputDimensionality: 768 });
    expect(fetchMock.mock.calls[0][0]).not.toContain("test-key");
  });
  it("fails over on quota errors but not on malformed requests", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(Response.json({ embeddings: [{ values: Array(768).fill(1) }] }));
    vi.stubGlobal("fetch", fetchMock);
    await embedTexts(["Document"], "RETRIEVAL_DOCUMENT");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mockClear().mockResolvedValue(new Response(null, { status: 400 }));
    await expect(embedTexts(["Document"], "RETRIEVAL_DOCUMENT")).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it("refuses a generated answer containing fabricated citation IDs", async () => {
    generate.mockResolvedValue({ content: { answer: "Unsupported claim", sourceIds: ["invented"], insufficient: false } });
    const answer = await answerProjectQuestion("What is implemented?", "en", [{ id: "actual", content: "Source" }]);
    expect(answer.insufficient).toBe(true);
    expect(answer.sourceIds).toEqual([]);
    expect(answer.answer).not.toContain("Unsupported claim");
  });
  it("accepts only supplied citations and deduplicates them", async () => {
    generate.mockResolvedValue({ content: { answer: "Uses PostgreSQL.", sourceIds: ["actual", "actual"], insufficient: false } });
    const answer = await answerProjectQuestion("What database?", "en", [{ id: "actual", content: "Uses PostgreSQL." }]);
    expect(answer.sourceIds).toEqual(["actual"]);
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ domain: "projects" }));
  });
});
