import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { projectSnapshotSchema, milestonesSchema, milestoneProgress, EMBEDDING_MODEL } from "@/lib/projects/schemas";
import portfolioMilestones from "../../docs/portfolio/milestones.json";

export async function getPublicProjectExtras(slugs: string[]) {
  try {
    const projects = await getPrisma().project.findMany({
      where: { slug: { in: slugs }, showOnPortfolio: true },
      select: { slug: true, integration: { select: { enabled: true } }, knowledge: {
        where: { status: "PUBLISHED" }, select: { id: true, narrative: true, publishedAt: true, chunks: { select: { path: true, sourceUrl: true }, distinct: ["path"] } },
      } },
    });
    return Object.fromEntries(projects.map((project) => {
      const snapshot = projectSnapshotSchema.safeParse(project.knowledge[0]?.narrative);
      // Preview shares Production's published corpus. Show this repository's
      // candidate roadmap without syncing or writing to the shared database.
      const milestonePreview = process.env.VERCEL_ENV === "preview" && snapshot.success && snapshot.data.metadata.repositoryFullName.toLowerCase() === "mazon64/portafolio";
      const revision = process.env.VERCEL_GIT_COMMIT_SHA;
      const milestones = milestonePreview ? milestonesSchema.parse(portfolioMilestones.map((item) => ({ ...item,
        evidence: revision && /^[a-f0-9]{40}$/.test(revision) ? `https://github.com/Mazon64/portafolio/blob/${revision}/${item.evidence}` : "",
      }))) : snapshot.success ? snapshot.data.milestones : [];
      return [project.slug, { assets: snapshot.success ? snapshot.data.assets : [], milestones,
        managed: Boolean(project.integration), milestonePreview,
        narrative: snapshot.success ? { es: snapshot.data.es, en: snapshot.data.en } : null,
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
