-- Requires the unversioned application cutover and retirement of legacy clients.
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE "AiContextVersion", "DocumentArtifact", "JobApplication" IN ACCESS EXCLUSIVE MODE;

-- Check preservation within the same locked snapshot as the schema change.
CREATE TEMP TABLE document_contract_snapshot ON COMMIT DROP AS
SELECT
  (SELECT jsonb_agg(to_jsonb(a) - 'version' ORDER BY a."id") FROM "DocumentArtifact" a) AS artifacts,
  (SELECT jsonb_agg(to_jsonb(j) ORDER BY j."id") FROM "JobApplication" j) AS applications,
  (SELECT to_jsonb(c) FROM "AiContextVersion" c ORDER BY c."createdAt" DESC, c."id" DESC LIMIT 1) AS context;

WITH current_context AS (
  SELECT "id" FROM "AiContextVersion"
  ORDER BY "createdAt" DESC, "id" DESC LIMIT 1
)
DELETE FROM "AiContextVersion"
WHERE "id" NOT IN (SELECT "id" FROM current_context);

CREATE UNIQUE INDEX "AiContextVersion_single_current"
ON "AiContextVersion" ((true));
ALTER TABLE "DocumentArtifact" DROP CONSTRAINT "DocumentArtifact_version_positive";
ALTER TABLE "DocumentArtifact" DROP COLUMN "version";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM document_contract_snapshot s
    WHERE s.artifacts IS DISTINCT FROM
      (SELECT jsonb_agg(to_jsonb(a) ORDER BY a."id") FROM "DocumentArtifact" a)
    OR s.applications IS DISTINCT FROM
      (SELECT jsonb_agg(to_jsonb(j) ORDER BY j."id") FROM "JobApplication" j)
    OR s.context IS DISTINCT FROM
      (SELECT to_jsonb(c) FROM "AiContextVersion" c ORDER BY c."createdAt" DESC, c."id" DESC LIMIT 1)
  ) THEN
    RAISE EXCEPTION 'Document contract preservation check failed';
  END IF;
END $$;
COMMIT;
