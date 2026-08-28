-- Supabase extensions are enabled once by an administrator. The application role
-- verifies pgvector without requiring database-owner privileges.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        RAISE EXCEPTION 'The vector extension must be enabled before this migration';
    END IF;
END
$$;

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('es', 'en');

-- CreateEnum
CREATE TYPE "SkillPresentation" AS ENUM ('icon_tiles', 'badges');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('planned', 'in_progress', 'paused', 'completed', 'archived');

-- CreateTable
CREATE TABLE "Profile" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "linkedinUrl" TEXT,
    "githubUrl" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileTranslation" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "shortBio" TEXT NOT NULL,
    "longBio" TEXT NOT NULL,

    CONSTRAINT "ProfileTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "showOnPortfolio" BOOLEAN NOT NULL DEFAULT true,
    "showOnCv" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceTranslation" (
    "id" UUID NOT NULL,
    "experienceId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "role" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "ExperienceTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Education" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "showOnPortfolio" BOOLEAN NOT NULL DEFAULT true,
    "showOnCv" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationTranslation" (
    "id" UUID NOT NULL,
    "educationId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "degree" TEXT NOT NULL,

    CONSTRAINT "EducationTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "repositoryFullName" TEXT,
    "demoUrl" TEXT,
    "repositoryUrl" TEXT,
    "techStack" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "showOnPortfolio" BOOLEAN NOT NULL DEFAULT true,
    "showOnCv" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "ProjectStatus" NOT NULL DEFAULT 'planned',
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "lastTelemetryAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Project_progressPct_check" CHECK ("progressPct" BETWEEN 0 AND 100),
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTranslation" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detailedInfo" TEXT NOT NULL,

    CONSTRAINT "ProjectTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillCategory" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "presentation" "SkillPresentation" NOT NULL,
    "showOnPortfolio" BOOLEAN NOT NULL DEFAULT true,
    "showOnCv" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SkillCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillCategoryTranslation" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "SkillCategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "iconKey" TEXT,
    "showOnPortfolio" BOOLEAN NOT NULL DEFAULT true,
    "showOnCv" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "categoryId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillTranslation" (
    "id" UUID NOT NULL,
    "skillId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SkillTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_slug_key" ON "Profile"("slug");
CREATE INDEX "ProfileTranslation_locale_idx" ON "ProfileTranslation"("locale");
CREATE UNIQUE INDEX "ProfileTranslation_profileId_locale_key" ON "ProfileTranslation"("profileId", "locale");
CREATE UNIQUE INDEX "Experience_slug_key" ON "Experience"("slug");
CREATE INDEX "Experience_showOnPortfolio_order_idx" ON "Experience"("showOnPortfolio", "order");
CREATE INDEX "Experience_showOnCv_order_idx" ON "Experience"("showOnCv", "order");
CREATE INDEX "ExperienceTranslation_locale_idx" ON "ExperienceTranslation"("locale");
CREATE UNIQUE INDEX "ExperienceTranslation_experienceId_locale_key" ON "ExperienceTranslation"("experienceId", "locale");
CREATE UNIQUE INDEX "Education_slug_key" ON "Education"("slug");
CREATE INDEX "Education_showOnPortfolio_order_idx" ON "Education"("showOnPortfolio", "order");
CREATE INDEX "Education_showOnCv_order_idx" ON "Education"("showOnCv", "order");
CREATE INDEX "EducationTranslation_locale_idx" ON "EducationTranslation"("locale");
CREATE UNIQUE INDEX "EducationTranslation_educationId_locale_key" ON "EducationTranslation"("educationId", "locale");
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
CREATE UNIQUE INDEX "Project_repositoryFullName_key" ON "Project"("repositoryFullName");
CREATE INDEX "Project_showOnPortfolio_order_idx" ON "Project"("showOnPortfolio", "order");
CREATE INDEX "Project_showOnCv_order_idx" ON "Project"("showOnCv", "order");
CREATE INDEX "Project_status_idx" ON "Project"("status");
CREATE INDEX "ProjectTranslation_locale_idx" ON "ProjectTranslation"("locale");
CREATE UNIQUE INDEX "ProjectTranslation_projectId_locale_key" ON "ProjectTranslation"("projectId", "locale");
CREATE UNIQUE INDEX "SkillCategory_slug_key" ON "SkillCategory"("slug");
CREATE INDEX "SkillCategory_showOnPortfolio_order_idx" ON "SkillCategory"("showOnPortfolio", "order");
CREATE INDEX "SkillCategory_showOnCv_order_idx" ON "SkillCategory"("showOnCv", "order");
CREATE INDEX "SkillCategoryTranslation_locale_idx" ON "SkillCategoryTranslation"("locale");
CREATE UNIQUE INDEX "SkillCategoryTranslation_categoryId_locale_key" ON "SkillCategoryTranslation"("categoryId", "locale");
CREATE UNIQUE INDEX "Skill_slug_key" ON "Skill"("slug");
CREATE INDEX "Skill_categoryId_order_idx" ON "Skill"("categoryId", "order");
CREATE INDEX "Skill_showOnPortfolio_order_idx" ON "Skill"("showOnPortfolio", "order");
CREATE INDEX "Skill_showOnCv_order_idx" ON "Skill"("showOnCv", "order");
CREATE INDEX "SkillTranslation_locale_idx" ON "SkillTranslation"("locale");
CREATE UNIQUE INDEX "SkillTranslation_skillId_locale_key" ON "SkillTranslation"("skillId", "locale");

-- AddForeignKey
ALTER TABLE "ProfileTranslation" ADD CONSTRAINT "ProfileTranslation_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExperienceTranslation" ADD CONSTRAINT "ExperienceTranslation_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EducationTranslation" ADD CONSTRAINT "EducationTranslation_educationId_fkey" FOREIGN KEY ("educationId") REFERENCES "Education"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTranslation" ADD CONSTRAINT "ProjectTranslation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SkillCategoryTranslation" ADD CONSTRAINT "SkillCategoryTranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SkillCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SkillCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SkillTranslation" ADD CONSTRAINT "SkillTranslation_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
