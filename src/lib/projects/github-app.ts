import "server-only";
import { createSign } from "node:crypto";
import { z } from "zod";
import { boundedBody } from "./http";
import { assertRepositorySuffix, repositorySchema, type RepositorySource } from "./github";

const id = z.string().regex(/^[1-9]\d{0,19}$/);
export function githubAppConfigured() {
  return process.env.VERCEL_ENV !== "preview" && Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY);
}
export class GithubAppError extends Error {
  constructor(readonly status: number) { super(`GitHub App HTTP ${status}`); this.name = "GithubAppError"; }
}
function appJwt() {
  if (!githubAppConfigured()) throw new Error("GitHub App unavailable");
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const payload = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iat: now - 60, exp: now + 540, iss: id.parse(process.env.GITHUB_APP_ID) })}`;
  const signature = createSign("RSA-SHA256").update(payload).sign(process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, "\n"), "base64url");
  return `${payload}.${signature}`;
}
async function api(path: string, token: string, init: RequestInit = {}, bytes = 300_000) {
  const response = await fetch(`https://api.github.com${path}`, { ...init, headers: { accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", authorization: `Bearer ${token}`, "content-type": "application/json" }, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new GithubAppError(response.status);
  return JSON.parse((await boundedBody(response, bytes)).toString("utf8")) as unknown;
}
export async function installationReader(installationId: string, repositoryId: string) {
  id.parse(installationId); id.parse(repositoryId);
  const numericId = Number(repositoryId);
  if (!Number.isSafeInteger(numericId)) throw new Error("Invalid repository ID");
  const grant = z.object({ token: z.string().min(1), expires_at: z.iso.datetime() }).parse(await api(`/app/installations/${installationId}/access_tokens`, appJwt(), {
    method: "POST", body: JSON.stringify({ repository_ids: [numericId], permissions: { contents: "read", metadata: "read" } }),
  }));
  const metadata = z.object({ id: z.number().int(), full_name: z.string().regex(/^[\w.-]+\/[\w.-]+$/), private: z.boolean(), visibility: z.enum(["public", "private", "internal"]), default_branch: z.string() }).parse(await api(`/repositories/${repositoryId}`, grant.token));
  if (String(metadata.id) !== repositoryId) throw new Error("Repository mismatch");
  // Expose only a repository-scoped reader. Tokens never leave this closure.
  return { repository: metadata, async read(suffix: string, bytes?: number) {
    if (!suffix.startsWith("/") || suffix.includes("..") || suffix.includes("\\")) throw new Error("Invalid repository path");
    if (Date.parse(grant.expires_at) <= Date.now()) throw new Error("Installation grant expired");
    return api(`/repos/${metadata.full_name}${suffix}`, grant.token, {}, bytes);
  } };
}

const FULL_PERMISSIONS = { contents: "read", metadata: "read", issues: "read", pull_requests: "read" } as const;
const MINIMAL_PERMISSIONS = { contents: "read", metadata: "read" } as const;
const grantSchema = z.object({ token: z.string().min(1), expires_at: z.iso.datetime() });
const installationsSchema = z.array(z.object({ id: z.number().int().positive(), account: z.object({ login: z.string() }).nullable().optional() }));

async function grant(installationId: string, permissions: Record<string, string>, repositoryIds?: number[]) {
  id.parse(installationId);
  return grantSchema.parse(await api(`/app/installations/${installationId}/access_tokens`, appJwt(), {
    method: "POST", body: JSON.stringify({ ...(repositoryIds ? { repository_ids: repositoryIds } : {}), permissions }),
  }));
}

async function installations() {
  return installationsSchema.parse(await api("/app/installations?per_page=100", appJwt())).slice(0, 20);
}

// Resolves the installation that covers a repository by its stable ID. The name is
// only a hint: a rename or transfer falls back to scanning this App's installations.
export async function findInstallation(repositoryId: string, fullNameHint?: string | null): Promise<string | null> {
  id.parse(repositoryId);
  if (fullNameHint && /^[\w.-]+\/[\w.-]+$/.test(fullNameHint)) {
    try {
      const found = z.object({ id: z.number().int().positive() }).parse(await api(`/repos/${fullNameHint}/installation`, appJwt()));
      await grant(String(found.id), MINIMAL_PERMISSIONS, [Number(repositoryId)]);
      return String(found.id);
    } catch (error) {
      if (!(error instanceof GithubAppError) || ![404, 422].includes(error.status)) throw error;
    }
  }
  for (const installation of await installations()) {
    try { await grant(String(installation.id), MINIMAL_PERMISSIONS, [Number(repositoryId)]); return String(installation.id); }
    catch (error) { if (!(error instanceof GithubAppError) || ![404, 422].includes(error.status)) throw error; }
  }
  return null;
}

export async function installationSource(installationId: string, repositoryId: string): Promise<RepositorySource> {
  id.parse(repositoryId);
  const numericId = Number(repositoryId);
  if (!Number.isSafeInteger(numericId)) throw new Error("Invalid repository ID");
  let activity = true;
  let access;
  try { access = await grant(installationId, FULL_PERMISSIONS, [numericId]); }
  catch (error) {
    // An installation approved before issues/pull_requests were requested still
    // serves documentation and code; activity and contributions are then skipped.
    if (!(error instanceof GithubAppError) || error.status !== 422) throw error;
    access = await grant(installationId, MINIMAL_PERMISSIONS, [numericId]);
    activity = false;
  }
  const repository = repositorySchema.parse(await api(`/repositories/${repositoryId}`, access.token));
  if (String(repository.id) !== repositoryId) throw new Error("Repository mismatch");
  return { repository, access: "installation", activity, async json(suffix, maxBytes) {
    assertRepositorySuffix(suffix);
    if (Date.parse(access.expires_at) <= Date.now() + 30_000) throw new Error("Installation grant expired");
    return api(`/repos/${repository.full_name}${suffix}`, access.token, {}, maxBytes);
  } };
}

export type InstallationRepository = { id: string; fullName: string; private: boolean; fork: boolean; archived: boolean; installationId: string };
export async function listInstallationRepositories(): Promise<InstallationRepository[]> {
  if (!githubAppConfigured()) return [];
  const page = z.object({ total_count: z.number().int(), repositories: z.array(z.object({ id: z.number().int().positive(), full_name: z.string(), private: z.boolean(), fork: z.boolean().default(false), archived: z.boolean().default(false) })) });
  const result: InstallationRepository[] = [];
  for (const installation of await installations()) {
    const access = await grant(String(installation.id), { metadata: "read" });
    for (let number = 1; number <= 3; number++) {
      const data = page.parse(await api(`/installation/repositories?per_page=100&page=${number}`, access.token, {}, 2_000_000));
      result.push(...data.repositories.map((repo) => ({ id: String(repo.id), fullName: repo.full_name, private: repo.private, fork: repo.fork, archived: repo.archived, installationId: String(installation.id) })));
      if (number * 100 >= data.total_count) break;
    }
  }
  return result;
}

// Resolves a private or organization repository name to its stable ID through the
// installation that covers it; returns null when the App is not installed there.
export async function resolveInstalledRepository(fullName: string): Promise<string | null> {
  if (!githubAppConfigured() || !/^[\w.-]+\/[\w.-]+$/.test(fullName)) return null;
  try {
    const installation = z.object({ id: z.number().int().positive() }).parse(await api(`/repos/${fullName}/installation`, appJwt()));
    const access = await grant(String(installation.id), { metadata: "read" });
    return String(z.object({ id: z.number().int().positive() }).parse(await api(`/repos/${fullName}`, access.token)).id);
  } catch (error) {
    if (error instanceof GithubAppError && error.status === 404) return null;
    throw error;
  }
}
