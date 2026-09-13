import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { boundedBody } from "./http";
import { MAX_CHUNKS, MAX_SOURCE_BYTES, sourcePathSchema } from "./schemas";

const repositorySchema = z.object({
  id: z.number().int().positive(),
  full_name: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  private: z.boolean(),
  default_branch: z.string(),
  name: z.string().default(""),
  description: z.string().nullable().default(null),
  homepage: z.string().nullable().default(null),
  archived: z.boolean().default(false),
  topics: z.array(z.string()).default([]),
  has_issues: z.boolean().optional(),
});
export type GithubRepository = z.infer<typeof repositorySchema>;
export type SourceChunk = { path: string; ordinal: number; content: string; sourceHash: string; sourceUrl: string };

export async function githubJson(path: string, maxBytes = 300_000): Promise<unknown> {
  const token = process.env.PROJECT_GITHUB_TOKEN?.trim();
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
  return JSON.parse((await boundedBody(response, maxBytes)).toString("utf8"));
}

export async function getRepository(fullNameOrId: string): Promise<GithubRepository> {
  const path = /^\d+$/.test(fullNameOrId)
    ? `/repositories/${fullNameOrId}`
    : /^[\w.-]+\/[\w.-]+$/.test(fullNameOrId) ? `/repos/${fullNameOrId}` : null;
  if (!path) throw new Error("Invalid repository identifier");
  const repository = repositorySchema.parse(await githubJson(path));
  // The public project/RAG pipeline only imports repositories verified public.
  if (repository.private) throw new Error("Project sources must be public");
  return repository;
}

export async function getBranchSha(repository: GithubRepository, branch: string) {
  const result = z.object({ commit: z.object({ sha: z.string().regex(/^[a-f0-9]{40}$/) }) }).parse(
    await githubJson(`/repos/${repository.full_name}/branches/${encodeURIComponent(branch)}`),
  );
  return result.commit.sha;
}

export function chunkSource(path: string, content: string, fullName: string, sha: string): SourceChunk[] {
  const sourceUrl = `https://github.com/${fullName}/blob/${sha}/${path.split("/").map(encodeURIComponent).join("/")}`;
  const chunks: SourceChunk[] = [];
  // Bounded overlapping windows retain local context and stable per-file ordinals.
  for (let start = 0; start < content.length; start += 2_000) {
    const text = content.slice(start, start + 2_400).trim();
    if (text) chunks.push({ path, ordinal: chunks.length, content: text, sourceHash: createHash("sha256").update(text).digest("hex"), sourceUrl });
    if (start + 2_400 >= content.length) break;
  }
  return chunks;
}

export async function getProjectSources(repository: GithubRepository, sha: string, paths: string[]) {
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("Invalid commit");
  const chunks: SourceChunk[] = [];
  let bytes = 0;
  for (const path of paths) {
    sourcePathSchema.parse(path);
    const file = z.object({ type: z.literal("file"), encoding: z.literal("base64"), content: z.string(), size: z.number().max(MAX_SOURCE_BYTES) }).parse(
      await githubJson(`/repos/${repository.full_name}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${sha}`),
    );
    const decoded = Buffer.from(file.content.replace(/\s/g, ""), "base64");
    bytes += decoded.byteLength;
    if (bytes > MAX_SOURCE_BYTES) throw new Error("Source budget exceeded");
    chunks.push(...chunkSource(path, decoded.toString("utf8"), repository.full_name, sha));
    if (chunks.length > MAX_CHUNKS) throw new Error("Chunk budget exceeded");
  }
  if (!chunks.length) throw new Error("No project sources");
  return chunks;
}
