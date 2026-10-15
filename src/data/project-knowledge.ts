import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { projectSnapshotSchema, milestoneProgress, EMBEDDING_MODEL } from "@/lib/projects/schemas";
import { disclosurePolicies } from "./project-disclosure";
import { canPublish, canUsePublicSources } from "@/lib/projects/disclosure";
import type { RepositoryAsset } from "@/lib/projects/schemas";

export async function getPublicProjectExtras(slugs: string[]) {
  const policies = new Map((await disclosurePolicies()).map((row) => [row.slug, row.policy]));
  try {
    const projects = await getPrisma().project.findMany({
      where: { slug: { in: slugs }, showOnPortfolio: true },
      select: { slug: true, integration: { select: { enabled: true } }, knowledge: {
        where: { status: "PUBLISHED" }, select: { id: true, narrative: true, publishedAt: true, chunks: { select: { path: true, sourceUrl: true }, distinct: ["path"] } },
      } },
    });
    return Object.fromEntries(projects.filter((project) => { const policy = policies.get(project.slug); return !policy || canPublish(policy, "portfolio"); }).map((project) => {
      const policy = policies.get(project.slug);
      const approvedAssets: RepositoryAsset[] = policy?.fields.media && policy.mode !== "ANONYMIZED" ? policy.media.map((media) => ({ url: `/api/project-media/${media.id}`, sourcePath: `image-${media.id}.webp`, blobSha: media.id.replace(/-/g, "").padEnd(40, "0"), category: media.category, alt: media.alt, caption: media.caption, analysisModel: "administrator-approved", analysisPolicy: "disclosure" })) : [];
      if (policy && policy.mode !== "FULL") return [project.slug, { assets: approvedAssets, milestones: [], managed: false, narrative: null, progressPct: null, sources: [], indexed: false }];
      const snapshot = projectSnapshotSchema.safeParse(project.knowledge[0]?.narrative);
      const milestones = snapshot.success && (!policy || policy.fields.milestones) ? snapshot.data.milestones.map((milestone) => !policy || policy.fields.sources ? milestone : { ...milestone, evidence: "", assessment: milestone.assessment ? { ...milestone.assessment, citations: [] } : undefined }) : [];
      return [project.slug, { assets: [...approvedAssets, ...(snapshot.success && (!policy || policy.fields.media) ? snapshot.data.assets : [])], milestones,
        managed: Boolean(project.integration),
        narrative: snapshot.success ? { es: snapshot.data.es, en: snapshot.data.en } : null,
        progressPct: milestoneProgress(milestones), sources: !policy || policy.fields.sources ? project.knowledge[0]?.chunks ?? [] : [],
        indexed: project.knowledge.length > 0 && Boolean(project.integration?.enabled) }];
    }));
  } catch (error) {
    // Preserve the existing portfolio before the expand migration is applied.
    if ((error as { code?: string }).code === "P2021") return {};
    throw error;
  }
}

export async function retrieveProjectSources(slug: string, embedding: string) {
  const policy = (await disclosurePolicies()).find((row) => row.slug === slug)?.policy;
  if (policy && !canUsePublicSources(policy, "chat")) return [];
  return getPrisma().$queryRaw<Array<{ id: string; content: string; path: string; sourceUrl: string; distance: number; knowledgeId: string }>>(Prisma.sql`
    SELECT c.id, c.content, c.path, c."sourceUrl", k.id AS "knowledgeId",
      (c.embedding OPERATOR(extensions.<=>) ${embedding}::extensions.vector) AS distance
    FROM "ProjectKnowledgeChunk" c JOIN "ProjectKnowledge" k ON k.id = c."knowledgeId"
    JOIN "Project" p ON p.id = k."projectId"
    JOIN "ProjectIntegration" i ON i."projectId" = p.id
    WHERE p.slug = ${slug} AND p."showOnPortfolio" = true AND i.enabled = true
      AND k.status = 'PUBLISHED' AND k."embeddingModel" = ${EMBEDDING_MODEL}
    ORDER BY c.embedding OPERATOR(extensions.<=>) ${embedding}::extensions.vector ASC
    LIMIT 6
  `);
}
