import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { chunkSource, githubJson, type GithubRepository, type SourceChunk } from "./github";
import { MAX_CHUNKS, MAX_SOURCE_BYTES, MEDIA_ROOT, MEDIA_CATEGORIES, milestonesSchema, type ProjectMilestones } from "./schemas";

export type TreeFile = { path: string; sha: string; size: number; mode: string; type: string };
const fileSchema = z.object({ path: z.string(), sha: z.string().regex(/^[a-f0-9]{40}$/), size: z.number().default(0), mode: z.string(), type: z.string() });
const sourcePriority = ["README.md", "docs/architecture.md", "docs/srs.md", "docs/api_spec.md", "docs/project-integration.md"];

export function safeRepositoryPath(path: string) {
  return /^[A-Za-z0-9_./ -]+$/.test(path) && !path.split("/").some((part) => !part || part.startsWith(".")) && path.length <= 240;
}

export function discoverFiles(files: TreeFile[]) {
  const regular = files.filter((f) => f.type === "blob" && f.mode !== "120000" && safeRepositoryPath(f.path));
  const documents = regular.filter((f) => /\.md$/i.test(f.path) &&
    (f.path.toLowerCase() === "readme.md" || f.path.startsWith("docs/")) && !f.path.startsWith(MEDIA_ROOT) && f.size <= 40_000)
    .sort((a, b) => {
      const priority = (p: string) => { const index = sourcePriority.findIndex((value) => value.toLowerCase() === p.toLowerCase()); return index < 0 ? 100 : index; };
      return priority(a.path) - priority(b.path) || a.path.localeCompare(b.path);
    }).slice(0, 12);
  const manifests = regular.filter((f) => /(^|\/)(package\.json|pyproject\.toml|requirements\.txt|go\.mod|Cargo\.toml|pom\.xml|composer\.json)$/.test(f.path) &&
    f.path.split("/").length <= 3 && !/(^|\/)(node_modules|vendor|dist|build)\//.test(f.path) && f.size <= 25_000).slice(0, 8);
  const categoryOrder = ["interface", "features", "results", "diagrams"];
  const images = regular.filter((f) => f.path.startsWith(MEDIA_ROOT) && /\.(png|jpe?g|webp)$/i.test(f.path) && f.size <= 4_000_000 &&
    MEDIA_CATEGORIES.includes(f.path.slice(MEDIA_ROOT.length).split("/")[0] as typeof MEDIA_CATEGORIES[number]))
    .sort((a, b) => {
      const rank = (f: TreeFile) => (/\/(cover|portada)\./i.test(f.path) ? -10 : 0) + categoryOrder.indexOf(f.path.slice(MEDIA_ROOT.length).split("/")[0]);
      return rank(a) - rank(b) || a.path.localeCompare(b.path);
    }).slice(0, 8);
  return { documents, manifests, images, milestones: regular.find((f) => f.path === "docs/portfolio/milestones.json" && f.size <= 25_000) };
}

export async function readRepositoryBlob(repository: GithubRepository, file: TreeFile, limit: number) {
  const response = z.object({ encoding: z.literal("base64"), content: z.string(), size: z.number().max(limit) }).parse(
    await githubJson(`/repos/${repository.full_name}/git/blobs/${file.sha}`, Math.ceil(limit * 1.5) + 4_096),
  );
  const bytes = Buffer.from(response.content.replace(/\s/g, ""), "base64");
  if (bytes.length > limit) throw new Error("Repository blob budget exceeded");
  return bytes;
}

export function detectTechnologies(manifests: Array<{ path: string; content: string }>, paths: string[], languages: string[]) {
  const technologies = new Set<string>();
  const known: Record<string, string> = { next: "Next.js", react: "React", vue: "Vue", nuxt: "Nuxt", angular: "Angular", express: "Express", typescript: "TypeScript", tailwindcss: "Tailwind CSS", prisma: "Prisma", pg: "PostgreSQL", "next-auth": "NextAuth.js", resend: "Resend", "@supabase/supabase-js": "Supabase", sharp: "Sharp" };
  for (const file of manifests) {
    if (file.path.endsWith("package.json")) {
      try {
        const data = JSON.parse(file.content);
        const deps = { ...data.dependencies, ...data.devDependencies };
        for (const [key, label] of Object.entries(known)) if (Object.hasOwn(deps, key)) technologies.add(label);
      } catch { /* Non-standard manifests remain evidence, never executable code. */ }
    }
    if (/pyproject\.toml$|requirements\.txt$/.test(file.path)) technologies.add("Python");
    if (file.path.endsWith("go.mod")) technologies.add("Go");
    if (file.path.endsWith("Cargo.toml")) technologies.add("Rust");
    if (file.path.endsWith("pom.xml")) technologies.add("Java");
    if (file.path.endsWith("composer.json")) technologies.add("PHP");
  }
  if (paths.some((p) => /(^|\/)Dockerfile$/.test(p))) technologies.add("Docker");
  if (paths.includes("vercel.json")) technologies.add("Vercel");
  for (const language of languages) technologies.add(language);
  return [...technologies].slice(0, 20);
}

export function repositoryDemoUrl(homepage: string | null) {
  try {
    const url = new URL(homepage ?? "");
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function parseRepositoryMilestones(value: unknown, repository: GithubRepository, sha: string, paths: Set<string>): ProjectMilestones {
  const input = z.array(z.object({
    id: z.string(), title: z.object({ es: z.string(), en: z.string() }), weight: z.number(), completed: z.boolean(), evidence: z.string(),
  })).max(20).parse(value);
  return milestonesSchema.parse(input.map((m) => {
    // Completed repository-defined goals must point to evidence in the same commit.
    if (!safeRepositoryPath(m.evidence) || !paths.has(m.evidence)) throw new Error("Milestone evidence is missing");
    return { ...m, evidence: `https://github.com/${repository.full_name}/blob/${sha}/${m.evidence.split("/").map(encodeURIComponent).join("/")}` };
  }));
}

export async function discoverProject(repository: GithubRepository, sha: string) {
  const tree = z.object({ truncated: z.boolean(), tree: z.array(fileSchema) }).parse(
    await githubJson(`/repos/${repository.full_name}/git/trees/${sha}?recursive=1`, 4_000_000),
  );
  if (tree.truncated || tree.tree.length > 30_000) throw new Error("Repository tree exceeds discovery budget");
  const selection = discoverFiles(tree.tree);
  const paths = new Set(tree.tree.filter((f) => f.type === "blob" && f.mode !== "120000" && safeRepositoryPath(f.path)).map((f) => f.path));
  const chunks: SourceChunk[] = [];
  let bytes = 0;
  const manifests: Array<{ path: string; content: string }> = [];
  for (const file of [...selection.manifests, ...selection.documents]) {
    if (bytes + file.size > MAX_SOURCE_BYTES - 25_000) continue;
    const content = (await readRepositoryBlob(repository, file, 40_000)).toString("utf8");
    const parts = chunkSource(file.path, content, repository.full_name, sha);
    if (chunks.length + parts.length > MAX_CHUNKS - 12) continue;
    bytes += Buffer.byteLength(content);
    chunks.push(...parts);
    if (selection.manifests.includes(file)) manifests.push({ path: file.path, content });
  }
  let milestones: ProjectMilestones = [];
  if (selection.milestones) {
    const text = (await readRepositoryBlob(repository, selection.milestones, 25_000)).toString("utf8");
    milestones = parseRepositoryMilestones(JSON.parse(text), repository, sha, paths);
    const content = JSON.stringify(milestones);
    chunks.push({ path: selection.milestones.path, ordinal: 0, content, sourceHash: createHash("sha256").update(content).digest("hex"), sourceUrl: `https://github.com/${repository.full_name}/blob/${sha}/${selection.milestones.path}` });
  } else if (repository.has_issues !== false) {
    const items = z.array(z.object({ number: z.number(), title: z.string(), state: z.enum(["open", "closed"]), html_url: z.string() })).parse(
      await githubJson(`/repos/${repository.full_name}/milestones?state=all&per_page=20`),
    );
    milestones = milestonesSchema.parse(items.map((m) => ({ id: `github-${m.number}`, title: { es: m.title, en: m.title }, weight: 1, completed: m.state === "closed", evidence: m.html_url })));
  }
  const languageMap = z.record(z.string(), z.number()).parse(await githubJson(`/repos/${repository.full_name}/languages`));
  const techStack = detectTechnologies(manifests, [...paths], Object.keys(languageMap));
  const metadata = {
    repositoryId: String(repository.id), repositoryFullName: repository.full_name, branch: repository.default_branch,
    demoUrl: repositoryDemoUrl(repository.homepage), techStack,
    status: repository.archived ? "ARCHIVED" as const : milestones.length && milestones.every((m) => m.completed) ? "COMPLETED" as const : "IN_PROGRESS" as const,
    sourcePaths: [...new Set(chunks.map((c) => c.path))],
  };
  const summary = JSON.stringify({ name: repository.name, description: repository.description, ...metadata });
  chunks.push({ path: "GitHub metadata", ordinal: 0, content: summary, sourceHash: createHash("sha256").update(summary).digest("hex"), sourceUrl: `https://github.com/${repository.full_name}/tree/${sha}` });
  return { chunks, images: selection.images, milestones, metadata };
}
