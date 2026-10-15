-- Expand only. Apply through the protected Production workflow before enabling
-- PROJECT_GOVERNANCE_ENABLED. No public roles may read internal evidence/policies.
CREATE TABLE "ProjectDisclosurePolicy" (
  "projectId" UUID PRIMARY KEY REFERENCES "Project"("id") ON DELETE CASCADE,
  "revision" UUID NOT NULL,
  "policy" JSONB NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE TABLE "ProjectRepository" (
  "id" UUID PRIMARY KEY,
  "projectId" UUID NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "repositoryId" TEXT NOT NULL,
  "installationId" TEXT,
  "fullName" TEXT NOT NULL,
  "visibility" TEXT NOT NULL CHECK ("visibility" IN ('public', 'private', 'internal')),
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "sourcePaths" TEXT[] NOT NULL,
  "analysis" JSONB,
  "lastSyncedAt" TIMESTAMPTZ(3),
  "leaseToken" UUID,
  "leaseUntil" TIMESTAMPTZ(3),
  "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE UNIQUE INDEX "ProjectRepository_projectId_repositoryId_key" ON "ProjectRepository"("projectId", "repositoryId");
CREATE INDEX "ProjectRepository_installationId_enabled_idx" ON "ProjectRepository"("installationId", "enabled");
CREATE TABLE "ProjectEvidence" (
  "id" UUID PRIMARY KEY,
  "projectId" UUID NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "repositoryId" UUID NOT NULL REFERENCES "ProjectRepository"("id") ON DELETE CASCADE,
  "policyRevision" UUID NOT NULL,
  "commitSha" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ProjectEvidence_repositoryId_commitSha_path_key" ON "ProjectEvidence"("repositoryId", "commitSha", "path");
CREATE INDEX "ProjectEvidence_projectId_policyRevision_idx" ON "ProjectEvidence"("projectId", "policyRevision");
ALTER TABLE "ProjectDisclosurePolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectRepository" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectEvidence" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "ProjectDisclosurePolicy", "ProjectRepository", "ProjectEvidence" FROM anon, authenticated;
ALTER TABLE "ChatTurn" ADD COLUMN "publicationVersion" TEXT;
ALTER TABLE "DocumentArtifact" ADD COLUMN "publicationVersion" TEXT;
CREATE TABLE "ProjectMedia" (
  "id" UUID PRIMARY KEY,
  "projectId" UUID NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "objectKey" TEXT NOT NULL,
  "width" INTEGER NOT NULL CHECK ("width" > 0 AND "width" <= 20000),
  "height" INTEGER NOT NULL CHECK ("height" > 0 AND "height" <= 20000),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ProjectMedia_objectKey_key" ON "ProjectMedia"("objectKey");
CREATE INDEX "ProjectMedia_projectId_idx" ON "ProjectMedia"("projectId");
ALTER TABLE "ProjectMedia" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "ProjectMedia" FROM anon, authenticated;
