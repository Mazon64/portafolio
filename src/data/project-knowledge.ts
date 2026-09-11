import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { assetsSchema, milestonesSchema, milestoneProgress, EMBEDDING_MODEL } from "@/lib/projects/schemas";

export async function getPublicProjectExtras(slugs: string[]) {
  try {
    const projects = await getPrisma().project.findMany({
      where: { slug: { in: slugs }, showOnPortfolio: true },
      select: { slug: true, integration: { select: { assets: true, milestones: true, enabled: true } }, knowledge: {
        where: { status: "PUBLISHED" }, select: { id: true, publishedAt: true, chunks: { select: { path: true, sourceUrl: true }, distinct: ["path"] } },
      } },
    });
    return Object.fromEntries(projects.map((project) => {
      const milestones = milestonesSchema.parse(project.integration?.milestones ?? []);
      return [project.slug, { assets: assetsSchema.parse(project.integration?.assets ?? []), milestones,
        progressPct: milestoneProgress(milestones), sources: project.knowledge[0]?.chunks ?? [],
        indexed: project.knowledge.length > 0 && Boolean(project.integration?.enabled) }];
    }));
  } catch (error) {
    // Preserve the existing portfolio before the expand migration is applied.
    if ((error as { code?: string }).code === "P2021") return {};
    throw error;
  }
}

export async function retrieveProjectSources(slug: string, embedding: string) {
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
