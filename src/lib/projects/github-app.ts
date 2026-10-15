import "server-only";
import { createSign } from "node:crypto";
import { z } from "zod";
import { boundedBody } from "./http";

const id = z.string().regex(/^[1-9]\d{0,19}$/);
export function githubAppConfigured() {
  return process.env.VERCEL_ENV !== "preview" && Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY);
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
  if (!response.ok) throw new Error(`GitHub App HTTP ${response.status}`);
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
