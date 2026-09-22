import "server-only";
import { createHash } from "node:crypto";
import { posix } from "node:path";
import { z } from "zod";
import { chunkSource, githubJson, type GithubRepository, type SourceChunk } from "./github";
import { MAX_CHUNKS, MAX_SOURCE_BYTES, MEDIA_ROOT, MEDIA_CATEGORIES, type RepositoryAsset } from "./schemas";

export type TreeFile = { path: string; sha: string; size: number; mode: string; type: string };
const fileSchema = z.object({ path: z.string(), sha: z.string().regex(/^[a-f0-9]{40}$/), size: z.number().default(0), mode: z.string(), type: z.string() });
const sourcePriority = ["README.md", "ROADMAP.md", "CHANGELOG.md", "docs/README.md", "docs/roadmap.md", "docs/architecture.md", "docs/srs.md"];

export function safeRepositoryPath(path: string) {
  return /^[A-Za-z0-9_./ ()\[\]@+-]+$/.test(path) && !path.split("/").some((part) => !part || part.startsWith(".")) &&
    !/(^|\/)(node_modules|vendor|dist|build|coverage|generated|__pycache__)\//i.test(path) && path.length <= 240;
}

export function imageCategory(path: string): RepositoryAsset["category"] {
  const explicit = path.startsWith(MEDIA_ROOT) ? path.slice(MEDIA_ROOT.length).split("/")[0] : "";
  if (MEDIA_CATEGORIES.includes(explicit as RepositoryAsset["category"])) return explicit as RepositoryAsset["category"];
  if (/diagram|architecture|schema/i.test(path)) return "diagrams";
  if (/result|report|benchmark/i.test(path)) return "results";
  if (/feature|workflow/i.test(path)) return "features";
  return "interface";
}

export function discoverImages(files: TreeFile[], documents: Array<{ path: string; content: string }> = []) {
  const references = new Set<string>();
  for (const document of documents) {
    // Only repository-relative Markdown/HTML images; never fetch arbitrary external URLs.
    for (const match of document.content.matchAll(/!\[[^\]]*\]\(<?([^\s)>]+)>?(?:\s+[^)]*)?\)|<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
      const link = match[1] ?? match[2];
      if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(link)) continue;
      try {
        const path = posix.normalize(posix.join(link.startsWith("/") ? "" : posix.dirname(document.path), decodeURIComponent(link).replace(/^\//, "").split(/[?#]/)[0]));
        if (safeRepositoryPath(path)) references.add(path);
      } catch { /* Invalid image links are optional, not a failed project import. */ }
    }
  }
  return files.filter((f) => f.type === "blob" && f.mode !== "120000" && safeRepositoryPath(f.path) &&
    /\.(png|jpe?g|webp)$/i.test(f.path) && f.size <= 4_000_000 &&
    (references.has(f.path) || f.path.startsWith(MEDIA_ROOT) || /(^|\/)(screenshots?|captures?)\//i.test(f.path)) &&
    !/(^|\/)(logo|icon|favicon|badge)([./_-]|$)/i.test(f.path))
    .sort((a, b) => {
      const rank = (f: TreeFile) => (/\/(cover|portada)\./i.test(f.path) ? -10 : 0) + ["interface", "features", "results", "diagrams"].indexOf(imageCategory(f.path));
      return rank(a) - rank(b) || a.path.localeCompare(b.path);
    }).slice(0, 8);
}

export function discoverFiles(files: TreeFile[]) {
  const regular = files.filter((f) => f.type === "blob" && f.mode !== "120000" && safeRepositoryPath(f.path));
  const documents = regular.filter((f) => /\.md$/i.test(f.path) &&
    (!f.path.includes("/") || /^(docs?|documentation)\//i.test(f.path)) && !/(^|\/)(AGENTS|CLAUDE|GEMINI)\.md$/i.test(f.path) && !f.path.startsWith(MEDIA_ROOT) && f.size <= 40_000)
    .sort((a, b) => {
      const priority = (p: string) => { const index = sourcePriority.findIndex((value) => value.toLowerCase() === p.toLowerCase()); return index < 0 ? 100 : index; };
      return priority(a.path) - priority(b.path) || a.path.localeCompare(b.path);
    }).slice(0, 12);
  const manifests = regular.filter((f) => /(^|\/)(package\.json|pyproject\.toml|requirements\.txt|go\.mod|Cargo\.toml|pom\.xml|composer\.json)$/.test(f.path) &&
    f.path.split("/").length <= 3 && !/(^|\/)(node_modules|vendor|dist|build)\//.test(f.path) && f.size <= 25_000).slice(0, 8);
  const code = regular.filter((f) => /\.(tsx?|jsx?|py|go|rs|java|cs|php|sql|prisma)$/i.test(f.path) &&
    !/(\.d\.ts|\.min\.js|lock)$/i.test(f.path) && f.size <= 12_000)
    .sort((a, b) => {
      const rank = (path: string) => /(^|\/)(schema\.prisma|main\.|index\.|app\.|server\.)/.test(path) ? 0 : /^(src|app|lib|server)\//.test(path) ? 1 : 2;
      return rank(a.path) - rank(b.path) || a.path.localeCompare(b.path);
    });
  // Reserve space for tests as well as implementation; this remains a bounded sample.
  const sample = [...code.filter((f) => !/test|spec/.test(f.path)).slice(0, 5), ...code.filter((f) => /test|spec/.test(f.path)).slice(0, 3)];
  return { documents, manifests, images: discoverImages(regular), code: sample };
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
  const documents: Array<{ path: string; content: string }> = [];
  let codeBytes = 0;
  let manifestBytes = 0;
  for (const file of [...selection.manifests, ...selection.code, ...selection.documents]) {
    const code = selection.code.includes(file);
    const manifest = selection.manifests.includes(file);
    if ((code && codeBytes + file.size > 12_000) || (manifest && manifestBytes + file.size > 12_000)) continue;
    const content = (await readRepositoryBlob(repository, file, 40_000)).toString("utf8");
    const fullParts = chunkSource(file.path, content, repository.full_name, sha);
    // A long README must not crowd out a smaller guide with explicit pending acceptance.
    // Keep original ordinals and verbatim excerpts, never pretend the sample is the full file.
    const pending = fullParts.findIndex((part) => /queda pendiente|sigue pendiente|remains pending|acceptance[^.\n]*pending|pending[^.\n]*acceptance/i.test(part.content));
    const sampled = new Set([0, pending > 0 ? pending : 1, fullParts.length - 1]);
    if (sampled.size < 3) sampled.add(1);
    const parts = !code && !manifest && fullParts.length > 3 ? fullParts.filter((_, index) => sampled.has(index)) : fullParts;
    const sourceBytes = parts.reduce((size, part) => size + Buffer.byteLength(part.content), 0);
    if (bytes + sourceBytes > MAX_SOURCE_BYTES - 60_000 || chunks.length + parts.length > MAX_CHUNKS - 19 ||
      (code && codeBytes + sourceBytes > 12_000) || (manifest && manifestBytes + sourceBytes > 12_000)) continue;
    bytes += sourceBytes;
    if (code) codeBytes += sourceBytes;
    if (manifest) manifestBytes += sourceBytes;
    chunks.push(...parts);
    if (selection.manifests.includes(file)) manifests.push({ path: file.path, content });
    if (selection.documents.includes(file)) documents.push({ path: file.path, content });
  }
  const activity = await discoverActivity(repository);
  chunks.push(...activity);
  const languageMap = z.record(z.string(), z.number()).parse(await githubJson(`/repos/${repository.full_name}/languages`));
  const techStack = detectTechnologies(manifests, [...paths], Object.keys(languageMap));
  const metadata = {
    repositoryId: String(repository.id), repositoryFullName: repository.full_name, branch: repository.default_branch,
    demoUrl: repositoryDemoUrl(repository.homepage), techStack,
    status: repository.archived ? "ARCHIVED" as const : "IN_PROGRESS" as const,
    sourcePaths: [...new Set(chunks.map((c) => c.path))],
  };
  const summary = JSON.stringify({ name: repository.name, description: repository.description, ...metadata });
  chunks.push({ path: "GitHub metadata", ordinal: 0, content: summary, sourceHash: createHash("sha256").update(summary).digest("hex"), sourceUrl: `https://github.com/${repository.full_name}/tree/${sha}` });
  return { chunks, images: discoverImages(tree.tree, documents), metadata };
}

async function discoverActivity(repository: GithubRepository): Promise<SourceChunk[]> {
  const chunks: SourceChunk[] = [];
  const add = (path: string, sourceUrl: string, data: Record<string, unknown>) => {
    const content = Object.entries(data).filter(([, value]) => value != null).map(([key, value]) => `${key}: ${value}`).join("\n");
    chunks.push({ path, ordinal: 0, content, sourceHash: createHash("sha256").update(content).digest("hex"), sourceUrl });
  };
  const base = `/repos/${repository.full_name}`;
  if (repository.has_issues !== false) {
    const milestones = z.array(z.object({ number: z.number().int().positive(), title: z.string(), description: z.string().nullable().optional(), state: z.enum(["open", "closed"]) })).max(4)
      .parse(await githubJson(`${base}/milestones?state=all&sort=due_on&direction=asc&per_page=4`));
    for (const item of milestones) add(`GitHub milestone #${item.number}`, `https://github.com/${repository.full_name}/milestone/${item.number}`, { ...item, title: item.title.slice(0, 200), description: item.description?.slice(0, 1_200) });
    const issues = z.array(z.object({ number: z.number().int().positive(), title: z.string(), body: z.string().nullable(), state: z.enum(["open", "closed"]), state_reason: z.string().nullable().optional(), pull_request: z.unknown().optional() })).max(4)
      .parse(await githubJson(`${base}/issues?state=all&sort=updated&direction=desc&per_page=4`));
    for (const item of issues.filter((item) => !item.pull_request)) add(`GitHub issue #${item.number}`, `https://github.com/${repository.full_name}/issues/${item.number}`, { title: item.title.slice(0, 200), body: item.body?.slice(0, 1_200), state: item.state, stateReason: item.state_reason });
  }
  const releases = z.array(z.object({ id: z.number().int(), name: z.string().nullable(), tag_name: z.string(), body: z.string().nullable(), draft: z.boolean(), prerelease: z.boolean() })).max(2)
    .parse(await githubJson(`${base}/releases?per_page=2`));
  for (const item of releases.filter((item) => !item.draft)) add(`GitHub release #${item.id}`, `https://github.com/${repository.full_name}/releases/tag/${encodeURIComponent(item.tag_name)}`, { name: item.name?.slice(0, 200), body: item.body?.slice(0, 1_200), prerelease: item.prerelease });
  return chunks;
}
