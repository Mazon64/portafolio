# Unversioned Documents: Expand And Contract

## Status And Scope

Prepared locally only. No migration, deployment, integration, or production data
change has been performed. Do not promote all of this work in one deployment.
The checked-in application requires the expand migration before artifact writes.
The old schema rejects omitted `version` values; a successful build is not proof
that the production database is ready. Preview remains read-only.

## Phase 1: Compatibility Migration

Promote only `20260908120000_expand_unversioned_documents/migration.sql` first,
following the protected Production workflow in `deployment.md`. It adds a
constant default of 1 and removes the counter's unique index, without changing
any existing document, source content, context row, or publication constraint.
Old Prisma clients still read a non-null positive integer and can continue their
existing writes. A nullable expansion would be unsafe: old clients select the
required integer and cannot deserialize nulls.

Do not replace this with a column drop or edit an already applied migration.
Verify existing readers and writers against the expanded schema before approval
of the application phase. No database credentials are needed for local build.

## Phase 2: Application Cutover

Deploy the application only after phase 1 is confirmed. The Prisma client ignores
the legacy column and no longer reads, returns, allocates, or writes counters.
The database default is only a compatibility placeholder, not a sequence.
`AiContext` maps to the existing `AiContextVersion` table, avoiding a new table,
dual writes, copied private data, and content loss. Saves update the current row
in place, creating a row only for an empty table. Serializable retries protect
concurrent initial saves. Ordering by timestamp then UUID deterministically
chooses the current row even if legacy timestamps tie. The legacy `createdAt`
column records the latest save so overlapping old readers see current content.

No new context revisions are appended by this application. Preexisting history
is deliberately retained until the contract, because old deployments may still
append rows. Source hashes still use context content, not a row ID or counter.
Draft signatures, idempotent UUIDs, publication state, and the other CMS entities'
optimistic `updatedAt` safeguards remain unchanged.

## Phase 3: Contract, Not Yet Scheduled

The SQL below is intentionally outside `prisma/migrations`, so `migrate deploy`
cannot apply it prematurely. Before turning it into a reviewed migration:

1. Retire all old Production, Preview, rollback and worker deployments that read
   the counter or append context rows. Stop document writes for the maintenance
   window and drain in-flight requests.
2. Take a protected database backup and verify restore procedures. Review the
   context rows privately, especially timestamp ties, and confirm the selected
   current professional and personal text. Do not export private content into Git.
3. Verify artifact counts, content/source hashes, current context text, public CV
   uniqueness, and job-application relations before and after the transaction.
4. Add the SQL as a new contract migration only with explicit approval. Remove
   the ignored `version` field from `schema.prisma` in that follow-up. Keep the
   context table mapping and mapped index name; no physical rename is needed.
5. Apply only via the protected Production workflow from `main`. Test context
   update/initial creation, generation/save, publication, deletion and fallback.
   Do not roll back to a pre-cutover binary after contract; recovery requires a
   coordinated restore, not merely redeploying an old application.

```sql
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE "AiContextVersion", "DocumentArtifact" IN ACCESS EXCLUSIVE MODE;

-- Preserve the exact current row and its complete source text.
WITH current_context AS (
  SELECT "id" FROM "AiContextVersion"
  ORDER BY "createdAt" DESC, "id" DESC LIMIT 1
)
DELETE FROM "AiContextVersion"
WHERE "id" NOT IN (SELECT "id" FROM current_context);

-- Enforce current-only storage, including concurrent initial saves.
CREATE UNIQUE INDEX "AiContextVersion_single_current"
ON "AiContextVersion" ((true));

ALTER TABLE "DocumentArtifact"
  DROP CONSTRAINT "DocumentArtifact_version_positive";
ALTER TABLE "DocumentArtifact" DROP COLUMN "version";
COMMIT;
```

This contract permanently removes historical context rows and internal artifact
counter storage. It does not remove source entities, document JSON, applications,
publication tokens or any non-document CMS concurrency columns. Until it is
approved and applied, physical removal remains an explicitly pending issue.
