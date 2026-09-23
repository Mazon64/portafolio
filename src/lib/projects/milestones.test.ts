import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { milestoneSources, resolveMilestones } from "./milestones";
import { milestoneProgress, type ProjectMilestones } from "./schemas";

const source = { path: "README.md", ordinal: 0, content: "The API is implemented. Owner acceptance remains pending.", sourceHash: "a".repeat(64), sourceUrl: `https://github.com/owner/repo/blob/${"b".repeat(40)}/README.md` };
const goal = { previousId: null, title: { es: "API", en: "API" }, status: "completed", reason: { es: "La documentación confirma la API.", en: "Documentation confirms the API." }, citations: [{ sourceId: "source-0", quote: "The API is implemented." }] };

describe("AI milestones owned by the portfolio service", () => {
  it("accepts readable Markdown quotations without accepting paraphrases or rewriting source code", () => {
    const formatted = { ...source, content: "Activated with `CHAT_ENABLED=true`; see [release 61](https://github.com/owner/repo/pull/61). Owner acceptance remains pending." };
    const citation = { sourceId: "source-0", quote: "Activated with CHAT_ENABLED=true; see release 61." };
    const result = resolveMilestones([{ ...goal, citations: [citation] }], [formatted], []);
    expect(result[0].assessment?.citations[0]).toMatchObject({ quote: citation.quote, sourceHash: formatted.sourceHash });
    expect(() => resolveMilestones([{ ...goal, citations: [{ ...citation, quote: "Activated with CHAT_ENABLED=false; see release 61." }] }], [formatted], [])).toThrow("unsupported");
    expect(() => resolveMilestones([{ ...goal, citations: [citation] }], [{ ...formatted, path: "src/config.ts" }], [])).toThrow("unsupported");
  });
  it("assigns identity and evidence server-side and reevaluates the same goal across syncs", () => {
    const first = resolveMilestones([goal], [source], []);
    expect(first[0]).toMatchObject({ id: expect.stringMatching(/^goal-/), weight: 1, completed: true, evidence: source.sourceUrl });
    expect(first[0].assessment?.citations[0]).toMatchObject({ sourceHash: source.sourceHash, path: "README.md" });
    const second = resolveMilestones([{ ...goal, previousId: first[0].id, status: "pending", citations: [{ sourceId: "source-0", quote: "Owner acceptance remains pending." }] }], [source], first);
    expect(second[0].id).toBe(first[0].id);
    expect(second[0].completed).toBe(false);
    expect(milestoneProgress(second)).toBe(0);
  });
  it("rejects invented source IDs, invented quotes, unknown identities and duplicate goals", () => {
    expect(() => resolveMilestones([{ ...goal, citations: [{ sourceId: "invented", quote: source.content }] }], [source], [])).toThrow("unsupported");
    expect(() => resolveMilestones([{ ...goal, citations: [{ sourceId: "source-0", quote: "Everything is accepted." }] }], [source], [])).toThrow("unsupported");
    expect(() => resolveMilestones([{ ...goal, previousId: "invented" }], [source], [])).toThrow("identities");
    expect(() => resolveMilestones([goal, goal], [source], [])).toThrow("Duplicate");
  });
  it("does not drop existing goals or count unavailable evidence as completed", () => {
    const previous = resolveMilestones([goal], [source], []);
    expect(() => resolveMilestones([], [], previous)).toThrow("identities");
    expect(() => resolveMilestones([{ ...goal, previousId: previous[0].id, citations: [] }], [], previous)).toThrow("missing");
    const unverified = resolveMilestones([{ ...goal, previousId: previous[0].id, status: "unverified", citations: [] }], [], previous);
    expect(unverified[0]).toMatchObject({ completed: false, evidence: "", assessment: { status: "unverified" } });
    expect(() => resolveMilestones([{ ...goal, previousId: null, status: "unverified", citations: [] }], [], [])).toThrow("missing");
  });
  it("can migrate legacy goal IDs without treating their old completion flag as proof", () => {
    const previous: ProjectMilestones = [{ id: "legacy-cms", title: goal.title, weight: 10, completed: true, evidence: "https://example.com/old" }];
    const result = resolveMilestones([{ ...goal, previousId: "legacy-cms", status: "unverified", citations: [] }], [], previous);
    expect(result[0]).toMatchObject({ id: "legacy-cms", weight: 1, completed: false, evidence: "" });
  });
  it("does not allow dependencies, images or metadata to prove milestone completion", () => {
    expect(milestoneSources(["GitHub metadata", "package.json", "assets/demo.png"].map((path) => ({ ...source, path })))).toEqual([]);
    expect(resolveMilestones([], [], [])).toEqual([]);
    expect(milestoneProgress([])).toBeNull();
  });
});
