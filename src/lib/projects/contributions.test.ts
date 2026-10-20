import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { contributionSources } from "./contributions";
import type { RepositorySource } from "./github";

afterEach(() => vi.unstubAllGlobals());
const repository = { id: 42, full_name: "org/repo", private: true, default_branch: "main", name: "repo", description: null, homepage: null, archived: false, topics: [] };
function source(responses: Record<string, unknown>, activity = true): RepositorySource & { calls: string[] } {
  const calls: string[] = [];
  return { repository, access: "installation", activity, calls, async json(suffix) { calls.push(suffix); return responses[suffix.split("?")[0]] ?? []; } };
}

describe("contribution evidence", () => {
  it("queries by author, prefers merged pull requests and re-checks the numeric ID", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ id: 7, login: "owner" })));
    const repo = source({
      "/issues": [
        { number: 1, title: "Draft", body: null, html_url: "https://github.com/org/repo/pull/1", state: "open", user: { id: 7 }, pull_request: { merged_at: null } },
        { number: 2, title: "Shipped", body: "Body", html_url: "https://github.com/org/repo/pull/2", state: "closed", user: { id: 7 }, pull_request: { merged_at: "2026-10-01T00:00:00Z" } },
        { number: 3, title: "Bug", body: null, html_url: "https://github.com/org/repo/issues/3", state: "open", user: { id: 7 } },
        { number: 4, title: "Login reused by someone else", body: null, html_url: "https://github.com/org/repo/issues/4", state: "open", user: { id: 99 } },
      ],
      "/commits": [{ sha: "a".repeat(40), html_url: "https://github.com/org/repo/commit/a", author: { id: 7 }, commit: { message: "feat: x" } }],
      "/pulls": [{ number: 5, title: "Teammate change", user: { id: 8 } }],
      "/pulls/5/reviews": [{ id: 9, user: { id: 7 }, body: "LGTM", state: "APPROVED", html_url: "https://github.com/org/repo/pull/5#r9" }],
    });
    const chunks = await contributionSources(repo, ["7"]);
    expect(repo.calls[0]).toBe("/issues?creator=owner&state=all&sort=updated&direction=desc&per_page=30");
    expect(chunks.map((chunk) => chunk.path)).toEqual(["contributions/pull-2.md", "contributions/pull-1.md", "contributions/issue-3.md", `contributions/commit-${"a".repeat(40)}.md`, "contributions/review-9.md"]);
    expect(chunks.every((chunk) => chunk.contributorId === "7")).toBe(true);
  });
  it("skips activity an installation is not permitted to read", async () => {
    const repo = source({}, false);
    expect(await contributionSources(repo, ["7"])).toEqual([]);
    expect(repo.calls).toEqual([]);
  });
});
