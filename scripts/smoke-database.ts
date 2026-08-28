import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const categorySlugs = [
  "software-development",
  "infrastructure-delivery",
  "engineering-skills",
];

const replacedCategorySlugs = [
  "backend-data",
  "frontend-mobile",
  "devops-version-control",
  "architecture-engineering",
  "applied-ai",
];

const skillSlugs = [
  "nodejs",
  "expressjs",
  "javascript",
  "mysql",
  "vuejs",
  "react-native",
  "ionic",
  "docker",
  "git",
  "github",
  "api-development",
  "software-architecture",
  "single-sign-on",
  "ci-cd",
  "agile",
  "large-language-models",
  "prompt-engineering",
  "deterministic-llm-programming",
];

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for the database smoke test.");
  }
  return connectionString;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: getConnectionString() });
  const prisma = new PrismaClient({ adapter });

  try {
    const [extension] = await prisma.$queryRaw<
      Array<{ enabled: boolean; usable: boolean }>
    >`
      SELECT
        EXISTS (
          SELECT 1
          FROM pg_extension
          WHERE extname = 'vector'
        ) AS enabled,
        has_schema_privilege(current_user, 'extensions', 'USAGE') AS usable
    `;
    const [profiles, experiences, education, projects, categories, replacedCategories, skills, categorizedSkills] =
      await Promise.all([
        prisma.profile.count({ where: { slug: "main-profile" } }),
        prisma.experience.count({
          where: { slug: "universidad-colima-backend-internship" },
        }),
        prisma.education.count({
          where: { slug: "universidad-colima-software-engineering" },
        }),
        prisma.project.count(),
        prisma.skillCategory.count({ where: { slug: { in: categorySlugs } } }),
        prisma.skillCategory.count({
          where: { slug: { in: replacedCategorySlugs } },
        }),
        prisma.skill.count({ where: { slug: { in: skillSlugs } } }),
        prisma.skill.count({
          where: { category: { slug: { in: categorySlugs } } },
        }),
      ]);
    const translationCounts = await Promise.all([
      prisma.profileTranslation.count({
        where: { profile: { slug: "main-profile" } },
      }),
      prisma.experienceTranslation.count({
        where: { experience: { slug: "universidad-colima-backend-internship" } },
      }),
      prisma.educationTranslation.count({
        where: { education: { slug: "universidad-colima-software-engineering" } },
      }),
      prisma.skillCategoryTranslation.count({
        where: { category: { slug: { in: categorySlugs } } },
      }),
      prisma.skillTranslation.count({
        where: { skill: { slug: { in: skillSlugs } } },
      }),
    ]);

    if (!extension?.enabled) throw new Error("pgvector is not enabled.");
    if (!extension.usable) throw new Error("The prisma role cannot use pgvector.");
    if (profiles !== 1 || experiences !== 1 || education !== 1) {
      throw new Error("Core seed records are incomplete.");
    }
    if (
      categories !== 3 ||
      replacedCategories !== 0 ||
      skills !== 18 ||
      categorizedSkills !== 18
    ) {
      throw new Error("Skill seed records are incomplete.");
    }
    const expectedTranslationCounts = [2, 2, 2, 6, 36];
    if (translationCounts.some((count, index) => count !== expectedTranslationCounts[index])) {
      throw new Error("Bilingual seed translations are incomplete.");
    }

    console.log(
      `Database ready: ${profiles} profile, ${experiences} experience, ${education} education, ${categories} skill categories, ${skills} skills, ${projects} projects.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
