# Resume Copilot

A workspace for creating and managing independent resumes for different roles, with structured editing, live preview, and PDF export. Manual editing works without a Codex connection or OpenAI API key; Codex collaboration is planned.

## Project layout and stack

This pnpm monorepo uses TypeScript across three workspaces:

| Workspace            | Stack and responsibility                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| `apps/web`           | Next.js, React, Tailwind CSS and shadcn/ui; editor and shared preview/print layout.                      |
| `apps/api`           | NestJS, Better Auth, Drizzle and PostgreSQL; authentication, resume persistence and Chromium PDF export. |
| `packages/contracts` | Shared Zod schemas, inferred types and document defaults.                                                |

## Run locally

Requires Node.js **24 (>=24.21.0)**, pnpm **12.15.0**, PostgreSQL, a Google OAuth client, and Chrome/Chromium for PDF export. `.nvmrc` selects Node.js **24.21.0**.

1. Create `apps/api/.env` from [the API example](apps/api/.env.example) and `apps/web/.env` from [the Web example](apps/web/.env.example). Do not overwrite existing local files or commit secrets.
2. Configure API `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, a unique `BETTER_AUTH_SECRET` of at least 32 characters, and `BETTER_AUTH_URL=http://localhost:3000`. Set `HOST=127.0.0.1`, `PORT=3001`, and `PUPPETEER_EXECUTABLE_PATH` if Chromium is not found at a standard path.
3. Configure Web `BETTER_AUTH_URL=http://localhost:3000` and `API_INTERNAL_URL=http://127.0.0.1:3001`. Database credentials and auth secrets belong only in API configuration.
4. Register `http://localhost:3000/api/auth/callback/google` as the Google OAuth redirect URI. Start PostgreSQL and apply API migrations to the explicitly selected development database; see [database commands](#database-commands). Do not reset an existing database.

```bash
nvm use
npm install --global pnpm@12.15.0
pnpm install --frozen-lockfile
pnpm dev
```

Web: <http://localhost:3000> · API health: <http://localhost:3001/api/health>

Run either application separately with `pnpm dev:web` or `pnpm dev:api`. Run all commands below from the repository root.

## Database commands

API schemas and migrations live in `apps/api/src/database/schema` and `apps/api/drizzle`.

| Command            | Purpose                                                         |
| ------------------ | --------------------------------------------------------------- |
| `pnpm db:generate` | Generate a migration; review the SQL before applying it.        |
| `pnpm db:migrate`  | Apply pending migrations to the selected database.              |
| `pnpm db:push`     | Synchronize a disposable database, bypassing migration history. |
| `pnpm db:studio`   | Inspect a trusted local database.                               |

Drizzle reads `DATABASE_URL` from the shell, **not automatically from `apps/api/.env`**:

```bash
DATABASE_URL='postgresql://USER:PASSWORD@127.0.0.1:5432/resume_copilot' pnpm db:migrate
```

Replace the placeholders and verify the database target before executing. Do not use `db:push` on development/test/production databases maintained through migrations or expose Studio publicly.

## Checks

```bash
pnpm format
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @resume-copilot/web test
```

`pnpm test` runs all workspace tests. API tests require `AUTH_TEST_DATABASE_URL` pointing to an already-migrated database named **`resume_copilot_test` only**; tests clear test-only rows. Never use development or production data.

Vitest suites live beside the source behavior they cover. Run a focused suite with a workspace-relative path, for example:

```bash
pnpm --filter @resume-copilot/web exec vitest run lib/request.test.ts
pnpm --filter @resume-copilot/api test src/resumes/resumes.test.mts
```

Playwright discovers browser journeys under repository-root `tests/e2e/`; run them separately with `pnpm test:e2e`. No browser E2E suites are currently committed.

Oxlint and Oxfmt run separately; editor integration is optional.

## Further reading

- [Product definition](docs/product.en.md)
- [Architecture and designs](docs/designs/)
- [Current development handoff](docs/handoff.md)
