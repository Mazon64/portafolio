-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('public_cv', 'ats_cv', 'cover_letter');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateTable
CREATE TABLE "AiContextVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "professionalContext" TEXT NOT NULL,
    "personalContext" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiContextVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "locale" "Locale" NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "jobDescription" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentArtifact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "applicationId" UUID,
    "kind" "DocumentKind" NOT NULL,
    "locale" "Locale" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMPTZ(3),

    CONSTRAINT "DocumentArtifact_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DocumentArtifact_version_positive" CHECK ("version" > 0),
    CONSTRAINT "DocumentArtifact_application_kind" CHECK (
        ("kind" = 'public_cv' AND "applicationId" IS NULL) OR
        ("kind" IN ('ats_cv', 'cover_letter') AND "applicationId" IS NOT NULL)
    ),
    CONSTRAINT "DocumentArtifact_private_status" CHECK (
        "kind" = 'public_cv' OR ("status" = 'draft' AND "publishedAt" IS NULL)
    ),
    CONSTRAINT "DocumentArtifact_publication_time" CHECK (
        ("status" = 'draft' AND "publishedAt" IS NULL) OR
        ("status" IN ('published', 'archived') AND "publishedAt" IS NOT NULL)
    )
);

-- CreateIndex
CREATE INDEX "AiContextVersion_createdAt_idx" ON "AiContextVersion"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "JobApplication_createdAt_idx" ON "JobApplication"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "JobApplication_company_role_idx" ON "JobApplication"("company", "role");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentArtifact_kind_locale_version_key" ON "DocumentArtifact"("kind", "locale", "version");

-- CreateIndex
CREATE INDEX "DocumentArtifact_applicationId_createdAt_idx" ON "DocumentArtifact"("applicationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DocumentArtifact_kind_locale_status_createdAt_idx" ON "DocumentArtifact"("kind", "locale", "status", "createdAt" DESC);

-- Only one public CV can be published for each locale.
CREATE UNIQUE INDEX "DocumentArtifact_one_published_public_cv"
ON "DocumentArtifact"("kind", "locale")
WHERE "kind" = 'public_cv' AND "status" = 'published';

-- AddForeignKey
ALTER TABLE "DocumentArtifact" ADD CONSTRAINT "DocumentArtifact_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
