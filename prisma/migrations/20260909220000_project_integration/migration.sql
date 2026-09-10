-- Expand-only. Apply via the protected main workflow before enabling integrations.
BEGIN;
DO $$ BEGIN
  IF to_regtype('extensions.vector') IS NULL THEN
    RAISE EXCEPTION 'pgvector must be enabled in the Supabase extensions schema';
  END IF;
END $$;

CREATE TABLE "ProjectIntegration" (
  "projectId" UUID PRIMARY KEY REFERENCES "Project"("id") ON DELETE CASCADE,
  "repositoryId" TEXT NOT NULL UNIQUE,
  "branch" TEXT NOT NULL DEFAULT 'main',
  "sourcePaths" TEXT[] NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "assets" JSONB NOT NULL DEFAULT '[]',
  "milestones" JSONB NOT NULL DEFAULT '[]',
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CHECK (jsonb_typeof("assets") = 'array' AND jsonb_array_length("assets") <= 8),
  CHECK (jsonb_typeof("milestones") = 'array' AND jsonb_array_length("milestones") <= 20)
);
CREATE TABLE "ProjectSyncJob" (
  "id" UUID PRIMARY KEY,
  "projectId" UUID NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "deliveryId" TEXT NOT NULL UNIQUE,
  "requestedSha" TEXT,
  "configurationUpdatedAt" TIMESTAMPTZ(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED' CHECK ("status" IN ('QUEUED','PROCESSING','SUCCEEDED','FAILED','SUPERSEDED')),
  "attempts" INTEGER NOT NULL DEFAULT 0 CHECK ("attempts" BETWEEN 0 AND 5),
  "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseToken" UUID,
  "leaseUntil" TIMESTAMPTZ(3),
  "error" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMPTZ(3),
  CHECK ("status" <> 'PROCESSING' OR ("leaseToken" IS NOT NULL AND "leaseUntil" IS NOT NULL))
);
CREATE INDEX "ProjectSyncJob_status_availableAt_idx" ON "ProjectSyncJob"("status", "availableAt");
CREATE INDEX "ProjectSyncJob_projectId_createdAt_idx" ON "ProjectSyncJob"("projectId", "createdAt" DESC);

CREATE TABLE "ProjectKnowledge" (
  "id" UUID PRIMARY KEY,
  "projectId" UUID NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT','PUBLISHED')),
  "commitSha" TEXT NOT NULL,
  "repositoryFullName" TEXT NOT NULL,
  "configurationUpdatedAt" TIMESTAMPTZ(3) NOT NULL,
  "projectUpdatedAt" TIMESTAMPTZ(3) NOT NULL,
  "narrative" JSONB NOT NULL,
  "generationModel" TEXT NOT NULL,
  "embeddingModel" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMPTZ(3),
  CHECK (("status" = 'DRAFT' AND "publishedAt" IS NULL) OR ("status" = 'PUBLISHED' AND "publishedAt" IS NOT NULL))
);
CREATE INDEX "ProjectKnowledge_projectId_status_idx" ON "ProjectKnowledge"("projectId", "status");
-- One replaceable draft and one published corpus. No permanent version history.
CREATE UNIQUE INDEX "ProjectKnowledge_one_per_state" ON "ProjectKnowledge"("projectId", "status");
CREATE TABLE "ProjectKnowledgeChunk" (
  "id" UUID PRIMARY KEY,
  "knowledgeId" UUID NOT NULL REFERENCES "ProjectKnowledge"("id") ON DELETE CASCADE,
  "path" TEXT NOT NULL,
  "ordinal" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "embedding" extensions.vector(768) NOT NULL
);
CREATE UNIQUE INDEX "ProjectKnowledgeChunk_knowledgeId_path_ordinal_key"
  ON "ProjectKnowledgeChunk"("knowledgeId", "path", "ordinal");
CREATE TABLE "ProjectQueryQuota" (
  "key" TEXT PRIMARY KEY,
  "count" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "ProjectQueryQuota_expiresAt_idx" ON "ProjectQueryQuota"("expiresAt");
COMMIT;
