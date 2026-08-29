import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const [database] = await getPrisma().$queryRaw<Array<{ ready: boolean }>>`
      SELECT
        EXISTS (
          SELECT 1
          FROM "Profile" profile
          WHERE profile.slug = 'main-profile'
            AND (
              SELECT COUNT(DISTINCT translation.locale)
              FROM "ProfileTranslation" translation
              WHERE translation."profileId" = profile.id
            ) = 2
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "Experience" experience
          WHERE experience."showOnPortfolio"
            AND (
              SELECT COUNT(DISTINCT translation.locale)
              FROM "ExperienceTranslation" translation
              WHERE translation."experienceId" = experience.id
            ) <> 2
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "Education" education
          WHERE education."showOnPortfolio"
            AND (
              SELECT COUNT(DISTINCT translation.locale)
              FROM "EducationTranslation" translation
              WHERE translation."educationId" = education.id
            ) <> 2
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "Project" project
          WHERE project."showOnPortfolio"
            AND (
              SELECT COUNT(DISTINCT translation.locale)
              FROM "ProjectTranslation" translation
              WHERE translation."projectId" = project.id
            ) <> 2
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "SkillCategory" category
          WHERE category."showOnPortfolio"
            AND (
              SELECT COUNT(DISTINCT translation.locale)
              FROM "SkillCategoryTranslation" translation
              WHERE translation."categoryId" = category.id
            ) <> 2
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "Skill" skill
          JOIN "SkillCategory" category ON category.id = skill."categoryId"
          WHERE skill."showOnPortfolio"
            AND category."showOnPortfolio"
            AND (
              SELECT COUNT(DISTINCT translation.locale)
              FROM "SkillTranslation" translation
              WHERE translation."skillId" = skill.id
            ) <> 2
        ) AS ready
    `;

    if (!database?.ready) {
      return Response.json(
        { status: "not_ready" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    return Response.json(
      {
        status: "ready",
        version:
          process.env.APP_VERSION ??
          process.env.VERCEL_GIT_COMMIT_SHA ??
          "unknown",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Database readiness check failed.", error);
    return Response.json(
      { status: "not_ready" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
