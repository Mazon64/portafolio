# Unversioned Documents: Expand And Contract

## Rollout

1. Compatibility: PR #40, Production `d169827`, applied by protected workflow
   [34361635706](https://github.com/Mazon64/portafolio/actions/runs/34361635706).
   The old required counter received a default and its unique index was removed.
2. Application cutover: PR #41, Production commit `9d254a3`. The application no
   longer reads or writes counters. Context saves update the current row, with
   serializable retries for concurrent initial saves. Filter navigation preserves
   drafts; publication/context refresh and stale-deletion checks are included.
3. Contract: `20260909150000_contract_unversioned_documents` removes the unused
   column and retains only the current context. Apply exclusively from `main`
   through the protected Production migration workflow after the checks below.
   Merging the migration does not apply it; workflow completion is authoritative.

## Contract Preconditions

- Production and stable Preview must run the cutover application. Legacy
  deployments that read counters or append context revisions must be retired.
- Preserve a protected snapshot of the three affected tables and verify that it
  can be restored into an isolated PostgreSQL instance. Never commit source text
  or generated documents. The rest of the portfolio schema is unaffected.
- Verify the current context, artifact contents, source hashes and application
  relationships. The migration obtains exclusive locks before its snapshot,
  drains conflicting database transactions, and blocks new writes until commit.
  A five-second lock timeout aborts instead of waiting indefinitely.

## Contract Guarantees

The migration keeps the latest context by `createdAt DESC, id DESC` and enforces
one current row with a unique expression index. Its legacy physical table name
`AiContextVersion` is retained through Prisma's `AiContext` mapping; the name no
longer represents versioned storage. The expression index is managed in SQL.

Before committing, the migration compares all artifact fields except the removed
counter, all application fields, and the complete current context against its
locked snapshot. Any difference aborts the transaction. Document JSON, sources,
publication constraints, IDs and other CMS concurrency safeguards are preserved.

## Verification And Recovery

After the protected run, check migration status, absence of `version`, the
singleton index, readiness for both environments, and public CV routes. Verify
context update/creation, document save/publication and stale deletion through
tests and authenticated operation as available; HTTP smoke tests alone do not
prove administrative interactions.

Do not redeploy a pre-cutover binary after contract. Restore the affected schema
and its protected data snapshot together before attempting such a rollback.
The cutover binary itself is compatible with the final schema because its Prisma
client already ignores the removed column.
