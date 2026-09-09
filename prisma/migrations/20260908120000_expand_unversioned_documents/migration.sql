-- Deploy this compatibility phase BEFORE the unversioned application.
-- Old clients can still read non-null integers and allocate their own values.
-- New clients omit this legacy field entirely; it is no longer a counter.
BEGIN;
ALTER TABLE "DocumentArtifact" ALTER COLUMN "version" SET DEFAULT 1;
DROP INDEX "DocumentArtifact_kind_locale_version_key";
COMMIT;
