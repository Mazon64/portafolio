import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { githubJson, type RepositorySource, type SourceChunk } from "./github";

const user = z.object({ id: z.number().int() }).nullable();
const authoredSchema = z.array(z.object({ number: z.number().int(), title: z.string(), body: z.string().nullable(), html_url: z.url(), state: z.string(), user,
  pull_request: z.object({ merged_at: z.string().nullable().optional() }).optional() }));
const pullsSchema = z.array(z.object({ number: z.number().int(), title: z.string(), user }));
const reviewsSchema = z.array(z.object({ id: z.number().int(), user, body: z.string().nullable(), state: z.string(), html_url: z.url() }));
const commitsSchema = z.array(z.object({ sha: z.string(), html_url: z.url(), author: user, commit: z.object({ message: z.string() }) }));

// The login is only a query filter; every result is re-checked by numeric ID.
async function logins(githubIds: string[]) {
  const ids = new Set(githubIds);
  const found = await Promise.all(githubIds.slice(0, 3).map(async (id) => {
    try { return z.object({ id: z.number().int(), login: z.string().regex(/^[A-Za-z0-9-]{1,39}$/) }).parse(await githubJson(`/user/${id}`)); }
    catch { return null; }
  }));
  return found.filter((entry): entry is { id: number; login: string } => Boolean(entry && ids.has(String(entry.id))));
}

// Identity is a stable GitHub numeric ID, never a mutable login or repo ownership.
// Imported fork history is deliberately not used as evidence of personal work.
// Queries are filtered by author so busy repositories still surface the owner's work.
export async function contributionSources(source: RepositorySource, githubIds: string[]): Promise<SourceChunk[]> {
  if (!githubIds.length || !source.activity) return [];
  const { repository } = source;
  const ids = new Set(githubIds);
  const mine = (value: { id: number } | null) => Boolean(value && ids.has(String(value.id)));
  const chunks: SourceChunk[] = [];
  const add = (kind: string, identifier: string, contributorId: number, content: string, sourceUrl: string, limit = 1800) => {
    const text = `${content.slice(0, limit)}\nAttributed to GitHub ID ${contributorId}. This is evidence of this activity only, not sole authorship, leadership or global completion.`;
    chunks.push({ path: `contributions/${kind}-${identifier}.md`, ordinal: 0, contributorId: String(contributorId), content: text, sourceUrl, sourceHash: createHash("sha256").update(text).digest("hex") });
  };
  const authors = await logins(githubIds);
  for (const author of authors) {
    const authored = authoredSchema.parse(await source.json(`/issues?creator=${encodeURIComponent(author.login)}&state=all&sort=updated&direction=desc&per_page=30`)).filter((item) => mine(item.user));
    // Merged work first: it is the strongest evidence of an accepted contribution.
    const pulls = authored.filter((item) => item.pull_request).sort((a, b) => Number(Boolean(b.pull_request?.merged_at)) - Number(Boolean(a.pull_request?.merged_at))).slice(0, 8);
    for (const pull of pulls) add("pull", String(pull.number), pull.user!.id, `Authored pull request #${pull.number}. ${pull.pull_request?.merged_at ? `Merged at ${pull.pull_request.merged_at}.` : "Not verified as merged."}\nTitle: ${pull.title}\n${(pull.body ?? "").slice(0, 1200)}\nThis proves authorship of this pull request, not sole ownership of the product, team leadership or acceptance of unrelated features.`, pull.html_url);
    for (const issue of authored.filter((item) => !item.pull_request).slice(0, 3)) add("issue", String(issue.number), issue.user!.id, `Authored issue #${issue.number}: ${issue.title}. State: ${issue.state}. Closing an issue alone does not prove implementation.\n${issue.body ?? ""}`, issue.html_url, 1200);
    if (!repository.fork) {
      const commits = commitsSchema.parse(await source.json(`/commits?author=${encodeURIComponent(author.login)}&per_page=10`));
      for (const commit of commits.filter((commit) => mine(commit.author)).slice(0, 4)) add("commit", commit.sha, commit.author!.id, `Authored commit ${commit.sha}. Message is an author claim, not proof that tests or deployment succeeded.\n${commit.commit.message}`, commit.html_url, 800);
    }
  }
  if (authors.length) {
    // Reviews only matter on other people's pull requests; scan a few recent ones.
    const others = pullsSchema.parse(await source.json("/pulls?state=all&sort=updated&direction=desc&per_page=10")).filter((pull) => !mine(pull.user)).slice(0, 3);
    let reviewed = 0;
    for (const pull of others) {
      if (reviewed >= 2) break;
      const reviews = reviewsSchema.parse(await source.json(`/pulls/${pull.number}/reviews?per_page=30`)).filter((review) => mine(review.user)).slice(0, 2 - reviewed);
      for (const review of reviews) add("review", String(review.id), review.user!.id, `Reviewed pull request #${pull.number}: ${pull.title}. Review state: ${review.state}.\n${review.body ?? ""}`, review.html_url, 1200);
      reviewed += reviews.length;
    }
  }
  return chunks.slice(0, 16);
}
