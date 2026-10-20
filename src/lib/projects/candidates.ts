import "server-only";
import { z } from "zod";
import { boundedBody } from "./http";
import { listInstallationRepositories } from "./github-app";

export type RepositoryCandidate = {
  id: string; fullName: string; private: boolean; fork: boolean; archived: boolean;
  // "installation": the App can read it. "contribution": found through the owner's activity.
  origins: Array<"installation" | "owned" | "contribution">;
  installed: boolean;
};

const repositoryNode = z.object({ databaseId: z.number().int().positive(), nameWithOwner: z.string(), isPrivate: z.boolean(), isFork: z.boolean(), isArchived: z.boolean() });
const connection = z.object({ nodes: z.array(repositoryNode.nullable()) });
const owned = "repositories(first: 100, ownerAffiliations: [OWNER, ORGANIZATION_MEMBER, COLLABORATOR], orderBy: { field: PUSHED_AT, direction: DESC }) { nodes { ...repo } }";
const contributed = "repositoriesContributedTo(first: 100, includeUserRepositories: false, contributionTypes: [COMMIT, PULL_REQUEST, ISSUE, PULL_REQUEST_REVIEW], orderBy: { field: PUSHED_AT, direction: DESC }) { nodes { ...repo } }";
const fragment = "fragment repo on Repository { databaseId nameWithOwner isPrivate isFork isArchived }";

async function graphql(query: string, variables: Record<string, unknown> = {}) {
  const token = process.env.PROJECT_GITHUB_TOKEN?.trim();
  if (!token) return null;
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST", body: JSON.stringify({ query, variables }), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000),
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", accept: "application/vnd.github+json" },
  });
  if (!response.ok) throw new Error(`GitHub GraphQL HTTP ${response.status}`);
  const result = z.object({ data: z.unknown().optional(), errors: z.array(z.unknown()).optional() }).parse(JSON.parse((await boundedBody(response, 2_000_000)).toString("utf8")));
  if (result.errors?.length || !result.data) throw new Error("GitHub GraphQL error");
  return result.data;
}

// Repositories the owner owns, belongs to through an organization or contributed to.
// With the owner's own token this includes private ones it can see; with any other
// token only the owner's public activity is listed. Identity is the numeric ID.
export async function activityRepositories(ownerGithubId: string) {
  const viewer = await graphql("query { viewer { databaseId login } }");
  if (!viewer) return [];
  const self = z.object({ viewer: z.object({ databaseId: z.number().int(), login: z.string() }) }).parse(viewer).viewer;
  let user;
  if (String(self.databaseId) === ownerGithubId) {
    user = z.object({ viewer: z.object({ repositories: connection, repositoriesContributedTo: connection }) }).parse(await graphql(`query { viewer { ${owned} ${contributed} } } ${fragment}`)).viewer;
  } else {
    const login = z.object({ login: z.string().regex(/^[A-Za-z0-9-]{1,39}$/) }).parse(JSON.parse((await boundedBody(await fetch(`https://api.github.com/user/${ownerGithubId}`, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12_000), headers: { accept: "application/vnd.github+json" } }), 300_000)).toString("utf8"))).login;
    user = z.object({ user: z.object({ repositories: connection, repositoriesContributedTo: connection }).nullable() }).parse(await graphql(`query($login: String!) { user(login: $login) { ${owned} ${contributed} } } ${fragment}`, { login })).user;
    if (!user) return [];
  }
  const rows = (nodes: z.infer<typeof connection>["nodes"], origin: "owned" | "contribution") => nodes.flatMap((node) => node ? [{ ...node, origin }] : []);
  return [...rows(user.repositories.nodes, "owned"), ...rows(user.repositoriesContributedTo.nodes, "contribution")];
}

export async function repositoryCandidates(ownerGithubId: string | undefined): Promise<{ candidates: RepositoryCandidate[]; warnings: string[] }> {
  const warnings: string[] = [];
  const merged = new Map<string, RepositoryCandidate>();
  const add = (row: Omit<RepositoryCandidate, "origins" | "installed">, origin: RepositoryCandidate["origins"][number]) => {
    const current = merged.get(row.id) ?? { ...row, origins: [], installed: false };
    if (!current.origins.includes(origin)) current.origins.push(origin);
    if (origin === "installation") current.installed = true;
    merged.set(row.id, current);
  };
  const [installed, activity] = await Promise.allSettled([
    listInstallationRepositories(),
    ownerGithubId && /^\d+$/.test(ownerGithubId) ? activityRepositories(ownerGithubId) : Promise.resolve([]),
  ]);
  if (installed.status === "fulfilled") for (const repo of installed.value) add({ id: repo.id, fullName: repo.fullName, private: repo.private, fork: repo.fork, archived: repo.archived }, "installation");
  else warnings.push("INSTALLATIONS_UNAVAILABLE");
  if (activity.status === "fulfilled") for (const repo of activity.value) add({ id: String(repo.databaseId), fullName: repo.nameWithOwner, private: repo.isPrivate, fork: repo.isFork, archived: repo.isArchived }, repo.origin);
  else warnings.push("ACTIVITY_UNAVAILABLE");
  return { candidates: [...merged.values()].sort((a, b) => Number(b.installed) - Number(a.installed) || a.fullName.localeCompare(b.fullName)), warnings };
}
