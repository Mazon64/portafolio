<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project workflow

- Start feature and fix branches from `develop`.
- Merge reviewed feature branches into `develop`; this updates the stable Preview at `https://preview.davidaranda.dev`.
- Vercel ignores feature-branch builds. Only `develop` creates Preview deployments and only `main` creates Production deployments.
- Promote `develop` to `main` only after manual Preview approval. `main` deploys Production at `https://davidaranda.dev`.
- Never run database migrations from Preview. The single Supabase database is migrated only through the protected Production workflow from `main`.
- Keep `CMS_WRITES_ENABLED=false` in Preview; application code also rejects writes whenever `VERCEL_ENV=preview`.
- Run tests, lint, build, and `git diff --check` before every pull request.
- Read `docs/architecture.md`, `docs/deployment.md`, and `docs/srs.md` before substantial changes.
