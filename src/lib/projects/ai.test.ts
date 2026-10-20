import { afterEach, describe, expect, it, vi } from "vitest";
const { generate, attempts } = vi.hoisted(() => ({ generate: vi.fn(), attempts: vi.fn(() => ["test-key-a", "test-key-b"]) }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/documents/gemini", async (importOriginal) => ({ ...await importOriginal<typeof import("@/lib/documents/gemini")>(), generateStructuredDocument: generate, getApiKeyAttempts: attempts }));
import { answerProjectQuestion, digestSources, embedTexts, generateProjectNarrative, synthesisSources, vectorLiteral } from "./ai";
import { resolveMilestones } from "./milestones";
afterEach(() => { vi.unstubAllGlobals(); generate.mockReset(); });

describe("project embeddings and grounded answers", () => {
  it("uses a compact provider grammar while retaining full local milestone and narrative limits", async () => {
    generate.mockResolvedValue({ content: {}, model: "test" });
    await generateProjectNarrative([], { assets: [], previousMilestones: [], repositoryName: "Project" });
    const request = generate.mock.calls[0][0];
    expect(request.projectOutputTokens).toBe(16_384);
    expect(request.responseSchema.properties.milestones.items.required).toContain("citations");
    expect(request.responseSchema.properties.milestones.items.properties.status.enum).toEqual(["completed", "pending", "unverified"]);
    expect(JSON.stringify(request.responseSchema)).not.toMatch(/maxItems|maxLength|minItems|minLength/);
    const text = { summary: "A documented project summary.", problem: "Documented problem.", solution: "Documented solution.", architecture: "Documented architecture.", decisions: "Documented decisions.", results: "Documented results." };
    const goal = { previousId: null, title: { es: "Hito", en: "Goal" }, status: "pending", reason: { es: "Pendiente", en: "Pending" }, citations: [] };
    const valid = { names: { es: "Proyecto", en: "Project" }, narrative: { es: text, en: text }, milestones: [goal] };
    expect(request.validator.safeParse(valid).success).toBe(true);
    const extended = { ...text, experience: "Public project browsing.", administration: "Administrators edit bilingual records.", operations: "Reviewed releases deploy through CI." };
    const atlas = request.validator.parse({ ...valid, narrative: { es: extended, en: extended } });
    expect(atlas.narrative.en.administration).toBe(extended.administration);
    expect(request.responseSchema.properties.narrative.properties.en.properties).toHaveProperty("operations");
    expect(request.validator.safeParse({ ...valid, milestones: Array(21).fill(goal) }).success).toBe(false);
    expect(request.validator.safeParse({ ...valid, milestones: [{ ...goal, title: { es: "x".repeat(2001), en: "Goal" } }] }).success).toBe(false);
    expect(request.validator.safeParse({ ...valid, milestones: [{ ...goal, status: "invented" }] }).success).toBe(false);
    expect(request.validator.safeParse({ ...valid, narrative: { ...valid.narrative, en: { ...text, summary: "" } } }).success).toBe(false);
  });
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

const long = (path: string, body: string) => ({ path, ordinal: 0, content: `${body} ${"Context sentence about the system. ".repeat(30)}`, sourceHash: (path.length.toString(16) + body.length.toString(16)).padEnd(64, "0").slice(0, 64), sourceUrl: `https://github.com/o/r/blob/x/${path}` });
describe("two-stage project generation", () => {
  it("digests only long, uncached sources and keeps verbatim quotes only", async () => {
    const readme = long("README.md", "The CMS stores bilingual project records in PostgreSQL.");
    const cachedDoc = long("docs/srs.md", "Owner acceptance remains pending for the chat.");
    const short = { path: "GitHub issue #1", ordinal: 0, content: "title: Fix login", sourceHash: "c".repeat(64), sourceUrl: "https://github.com/o/r/issues/1" };
    const manifest = { ...long("package.json", "{}"), sourceHash: "d".repeat(64) };
    const cache = [{ sourceHash: cachedDoc.sourceHash, model: "gemini-3-flash-preview", policy: "digest-v1", summary: "Cached.", facts: [], quotes: [] }];
    generate.mockResolvedValue({ model: "gemini-3-flash-preview", content: { sources: [{ id: "e0", summary: "Stores projects.", facts: ["PostgreSQL storage"], quotes: ["The CMS stores bilingual project records in PostgreSQL.", "An invented sentence that is not in the source."] }] } });
    const digests = await digestSources([readme, cachedDoc, short, manifest], cache);
    expect(generate).toHaveBeenCalledOnce();
    expect(generate.mock.calls[0][0].source.excerpts.map((e: { path: string }) => e.path)).toEqual(["README.md"]);
    expect(digests.find((d) => d.sourceHash === readme.sourceHash)?.quotes).toEqual(["The CMS stores bilingual project records in PostgreSQL."]);
    expect(digests.find((d) => d.sourceHash === cachedDoc.sourceHash)?.summary).toBe("Cached.");
  });
  it("sends each source once and lets digest quotes pass citation verification", async () => {
    const readme = long("README.md", "The CMS stores bilingual project records in PostgreSQL.");
    const manifest = { ...long("package.json", "{}"), sourceHash: "d".repeat(64) };
    const issue = { path: "GitHub issue #1", ordinal: 0, content: "title: Fix login", sourceHash: "c".repeat(64), sourceUrl: "https://github.com/o/r/issues/1" };
    const quote = "The CMS stores bilingual project records in PostgreSQL.";
    const digests = [{ sourceHash: readme.sourceHash, model: "m", policy: "digest-v1", summary: "Stores projects.", facts: [], quotes: [quote] }];
    const sources = synthesisSources([readme, manifest, issue], digests);
    expect(sources).toEqual([{ id: "source-0", path: "README.md", summary: "Stores projects.", facts: [], quotes: [quote] }, { id: "source-1", path: "GitHub issue #1", content: "title: Fix login" }]);
    generate.mockResolvedValue({ content: {}, model: "test" });
    await generateProjectNarrative([readme, manifest, issue], { assets: [], previousMilestones: [], digests, technologies: ["Next.js"] });
    const request = generate.mock.calls[0][0];
    expect(request.source).not.toHaveProperty("milestoneEvidence");
    expect(JSON.stringify(request.source)).not.toContain("Context sentence");
    const goal = { previousId: null, title: { es: "Datos", en: "Data" }, status: "completed", reason: { es: "Hecho", en: "Done" }, citations: [{ sourceId: "source-0", quote }] };
    expect(resolveMilestones([goal], [readme, manifest, issue], [])[0].assessment?.citations[0].path).toBe("README.md");
  });
});
