import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { RepositorySource, SourceChunk } from "./github";

// Identity is a stable GitHub numeric ID, never a mutable login or repo ownership.
// Imported fork history is deliberately not used as evidence of personal work.
export async function contributionSources(source: RepositorySource, githubIds: string[]): Promise<SourceChunk[]> {
  if (!githubIds.length || !source.activity) return [];
  const { repository } = source;
  const ids = new Set(githubIds);
  const pulls = z.array(z.object({ number: z.number().int(), title: z.string(), body: z.string().nullable(), html_url: z.url(), user: z.object({ id: z.number().int() }).nullable(), merged_at: z.string().nullable() })).parse(await source.json(`/pulls?state=all&sort=updated&direction=desc&per_page=30`));
  const chunks: SourceChunk[] = pulls.filter((pull) => pull.user && ids.has(String(pull.user.id))).slice(0, 6).map((pull) => {
    const content = `Authored pull request #${pull.number} by GitHub ID ${pull.user!.id}. ${pull.merged_at ? `Merged at ${pull.merged_at}.` : "Not verified as merged."}\nTitle: ${pull.title}\n${(pull.body ?? "").slice(0, 1600)}\nThis proves authorship of this pull request, not sole ownership of the product, team leadership or acceptance of unrelated features.`;
    return { path: `contributions/pull-${pull.number}.md`, ordinal: 0, content, sourceHash: createHash("sha256").update(content).digest("hex"), sourceUrl: pull.html_url, contributorId: String(pull.user!.id) };
  });
  const add = (kind: string, identifier: string, contributorId: number, content: string, sourceUrl: string) => {
    const text = `${content.slice(0, 1800)}\nAttributed to GitHub ID ${contributorId}. This is evidence of this activity only, not sole authorship, leadership or global completion.`;
    chunks.push({ path: `contributions/${kind}-${identifier}.md`, ordinal: 0, contributorId: String(contributorId), content: text, sourceUrl, sourceHash: createHash("sha256").update(text).digest("hex") });
  };
  const issues = z.array(z.object({ number: z.number().int(), title: z.string(), body: z.string().nullable(), html_url: z.url(), state: z.string(), pull_request: z.unknown().optional(), user: z.object({ id: z.number().int() }).nullable() })).parse(await source.json(`/issues?state=all&sort=updated&per_page=30`));
  for (const issue of issues.filter((issue) => !issue.pull_request && issue.user && ids.has(String(issue.user.id))).slice(0, 3)) add("issue", String(issue.number), issue.user!.id, `Authored issue #${issue.number}: ${issue.title}. State: ${issue.state}. Closing an issue alone does not prove implementation.\n${issue.body ?? ""}`, issue.html_url);
  for (const pull of pulls.slice(0, 3)) {
    const reviews = z.array(z.object({ id: z.number().int(), user: z.object({ id: z.number().int() }).nullable(), body: z.string().nullable(), state: z.string(), html_url: z.url() })).parse(await source.json(`/pulls/${pull.number}/reviews?per_page=30`));
    for (const review of reviews.filter((review) => review.user && ids.has(String(review.user.id))).slice(0, 2)) add("review", String(review.id), review.user!.id, `Reviewed pull request #${pull.number}: ${pull.title}. Review state: ${review.state}.\n${review.body ?? ""}`, review.html_url);
  }
  if (!repository.fork) {
    const commits = z.array(z.object({ sha: z.string(), html_url: z.url(), author: z.object({ id: z.number().int() }).nullable(), commit: z.object({ message: z.string() }) })).parse(await source.json(`/commits?per_page=20`));
    for (const commit of commits.filter((commit) => commit.author && ids.has(String(commit.author.id))).slice(0, 3)) add("commit", commit.sha, commit.author!.id, `Authored commit ${commit.sha}. Message is an author claim, not proof that tests or deployment succeeded.\n${commit.commit.message}`, commit.html_url);
  }
  return chunks.slice(0, 16);
}
