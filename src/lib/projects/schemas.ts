import { z } from "zod";

export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;
export const MAX_CHUNKS = 64;
export const MAX_SOURCE_BYTES = 120_000;
export const MEDIA_ROOT = "docs/portfolio/images/";
export const MEDIA_CATEGORIES = ["interface", "features", "diagrams", "results"] as const;
export const VISION_POLICY_VERSION = "1";

export const localizedText = z.object({
  es: z.string().trim().min(1).max(2_000),
  en: z.string().trim().min(1).max(2_000),
});
export const sourcePathSchema = z.string().trim().max(200).regex(
  /^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.md$/,
).refine((path) => !path.split("/").some((part) => part.startsWith(".")));
export const assetUrlSchema = z.string().trim().max(2_000).refine((value) => {
  if (/^\/project-media\/[a-zA-Z0-9_/-]+\.(svg|png|jpg|jpeg|webp)$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "raw.githubusercontent.com" &&
      !url.username && !url.password && !url.port && !url.search && !url.hash &&
      /^\/[\w.-]+\/[\w.-]+\/[a-f0-9]{40}\/[^?]+\.(png|jpg|jpeg|webp)$/i.test(url.pathname);
  } catch { return false; }
}, "Use a local project image or a commit-pinned GitHub PNG/JPEG/WebP.");
export const assetsSchema = z.array(z.object({
  url: assetUrlSchema,
  alt: localizedText,
  caption: localizedText,
})).max(8);
export const repositoryAssetSchema = z.object({
  url: assetUrlSchema,
  sourcePath: z.string().max(240),
  blobSha: z.string().regex(/^[a-f0-9]{40}$/),
  category: z.enum(MEDIA_CATEGORIES),
  width: z.number().int().positive().max(20_000).optional(),
  height: z.number().int().positive().max(20_000).optional(),
  alt: localizedText,
  caption: localizedText,
  analysisModel: z.string().max(200),
  analysisPolicy: z.string().max(20),
});
export const repositoryAssetsSchema = z.array(repositoryAssetSchema).max(8);
export const milestonesSchema = z.array(z.object({
  id: z.string().regex(/^[a-z0-9-]{1,80}$/),
  title: localizedText,
  weight: z.number().int().min(1).max(100),
  completed: z.boolean(),
  evidence: z.string().trim().max(2_000).refine((value) => {
    if (!value) return true;
    try { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password; }
    catch { return false; }
  }),
})).max(20).refine((items) => new Set(items.map((item) => item.id)).size === items.length);

export const integrationSchema = z.object({
  projectId: z.uuid(),
  updatedAt: z.union([z.literal(""), z.iso.datetime()]),
  repositoryFullName: z.string().regex(/^[\w.-]+\/[\w.-]+$/).max(240),
  enabled: z.boolean(),
});

const narrativeLocaleSchema = z.object({
  summary: z.string().trim().min(20).max(2_000),
  problem: z.string().trim().min(10).max(2_000),
  solution: z.string().trim().min(10).max(2_000),
  architecture: z.string().trim().min(10).max(2_000),
  decisions: z.string().trim().min(10).max(2_000),
  results: z.string().trim().min(10).max(2_000),
});
export const narrativeSchema = z.object({ es: narrativeLocaleSchema, en: narrativeLocaleSchema });
export type ProjectNarrative = z.infer<typeof narrativeSchema>;
export type ProjectAssets = z.infer<typeof assetsSchema>;
export type ProjectMilestones = z.infer<typeof milestonesSchema>;
export const projectSnapshotSchema = narrativeSchema.extend({
  automatic: z.literal(true),
  names: localizedText,
  assets: repositoryAssetsSchema,
  milestones: milestonesSchema,
  metadata: z.object({
    repositoryId: z.string(),
    repositoryFullName: z.string(),
    branch: z.string(),
    demoUrl: z.string().nullable(),
    techStack: z.array(z.string().min(1).max(80)).max(20),
    status: z.enum(["IN_PROGRESS", "COMPLETED", "ARCHIVED"]),
    sourcePaths: z.array(z.string()),
  }),
});
export type ProjectSnapshot = z.infer<typeof projectSnapshotSchema>;
export type RepositoryAsset = z.infer<typeof repositoryAssetSchema>;

export function milestoneProgress(items: ProjectMilestones): number | null {
  if (!items.length) return null;
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  return Math.round(items.reduce((sum, item) => sum + (item.completed ? item.weight : 0), 0) / total * 100);
}

export function narrativeText(content: ProjectNarrative, locale: "es" | "en") {
  const labels = locale === "es"
    ? ["Problema", "Solución", "Arquitectura", "Decisiones técnicas", "Resultados y alcance"]
    : ["Problem", "Solution", "Architecture", "Technical decisions", "Results and scope"];
  return (["problem", "solution", "architecture", "decisions", "results"] as const)
    .map((key, i) => `${labels[i]}: ${content[locale][key]}`).join("\n\n");
}
