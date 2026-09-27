# Resume Copilot

Resume Copilot aims to help job seekers keep a reusable record of their experience and create tailored resumes. The planned workspace will support manual editing, preview, and PDF export, with optional collaboration through Codex. An in-product agent is planned for a later phase.

> **Early development:** Web routes Google sign-in, resume CRUD, and PDF export to NestJS. The user reports local browser acceptance of the latest editor and export flow; production behavior remains unverified. The experience library, new resume editor, and Codex integration are not yet complete. The independent AI polish feature has been removed.

## Run locally

Requires Node.js 22 (>=22.12) and pnpm 9.15.9. From the repository root:

```bash
nvm use                       # If using nvm
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open the Web app at <http://localhost:3000>. The NestJS API runs on port 3001 and provides a health check at <http://localhost:3001/api/health>.

To start only one application, use `pnpm dev:web` or `pnpm dev:api`.

## Google authentication (Auth C browser acceptance pending)

NestJS owns the Google-only Better Auth handler at `/api/auth/*`, session-guarded `GET /api/me`, resume CRUD at `/api/resumes`, and PDF export at `/api/export-pdf`. `/api/me` returns `{ data: { id, name, email }, error: null }`; Better Auth redirects, Cookies and errors retain its native protocol. Web rewrites these same-origin paths to NestJS. The old Web password-auth, resume CRUD, PDF export, and AI polish handlers are removed. The dashboard server layout and resume editor page check `/api/me` before rendering; `/resume/print` stays public for Chromium rendering with server-injected resume data. Web's proxy and NestJS both check the Origin of unsafe resume requests and PDF export. Web's Google login redirects to `/dashboard/resumes`; the user accepted local CRUD browser behavior. Auth C adds sign-out failure handling, client-state cleanup, cross-tab revalidation, and session-renewal tests; real multi-tab sign-out and Cookie renewal through Web still require browser verification.

For local API development, set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and browser-visible `BETTER_AUTH_URL` using `apps/api/.env.example` as a guide. Never commit real values. Database tables must be initialized on an **empty, confirmed** development database using `pnpm --filter @resume-copilot/api exec drizzle-kit migrate` with `DATABASE_URL` explicitly set to that target. The confirmed local `resume_copilot` development database was cleared, recreated, and migrated with the new schema; previous local data is gone. A later additive migration added nullable `user.image` because real Google profiles can include a picture; it was applied to both local development and the isolated test database without resetting either one. The ignored `apps/api/.env` now points `DATABASE_URL` at this development database; `.env.example` documents the URL shape without committing a working password. Keep the actual local database password private and never reuse it in production. Web's existing resume table can be used with the new user IDs through its server-side NestJS identity bridge; old user data is gone. Do not apply historical Web Drizzle migrations to the new database—NestJS owns schema migrations. Production requires HTTPS for `BETTER_AUTH_URL`. The Google redirect URI must be `http://localhost:3000/api/auth/callback/google` locally. Web uses `API_INTERNAL_URL` (defaults to `http://127.0.0.1:3001` for local development) for auth routing and server calls; set it to a trusted, reachable NestJS origin when building Web for another environment. The existing `docker-compose.prod.yml` still runs only Web and PostgreSQL, **not the API**, so it cannot serve this authentication flow until a separately approved deployment update. See the [Auth design](docs/designs/auth.md).

## MCP status

MCP's local Streamable HTTP trial is implemented but **disabled by default** (`MCP_ENABLED=false`). It uses Better Auth 1.7.5, `@better-auth/mcp` plus `@better-auth/cimd`, and the official SDK for browser consent, token refresh, and only `get_connection_status`. A minimal Git marketplace plugin and local catalog exist; the user confirmed installation and a successful tool call in a Codex task, but ordinary Chat interoperability and public hosting remain unverified. See [local plugin test steps](docs/plugin-local-trial.md). Migrations 0002/0003 were applied to the isolated test database and, after separate approval, the local development database. Current API tests have **57 passed / one known failed**: a refresh-replay interleaving can invalidate a second connection. This availability limitation is accepted only for a loopback normal-flow trial, not production. See the [MCP design](docs/designs/mcp.md) and [local trial preparation](docs/mcp-local-trial.md).

## Database commands

NestJS is the sole owner of new schema migrations. Run from the repository root (or use `pnpm --filter @resume-copilot/api db:<command>`):

| Command | Purpose |
| --- | --- |
| `pnpm db:generate` | Generate a migration from `apps/api/src/database/schema/`; review the SQL before applying it. |
| `pnpm db:migrate` | Apply pending API migrations to the **explicitly selected** database. |
| `pnpm db:push` | Directly synchronize a disposable database; it bypasses migration history. Do not use on the migrated dev/test databases or production. |
| `pnpm db:studio` | Open Drizzle Studio for a trusted local database; do not expose it publicly. |

`migrate`, `push`, and `studio` read `DATABASE_URL` from the command's environment, **not automatically from** `apps/api/.env`. Confirm its host and database name before invoking them; these scripts do not run any operation by themselves. Web's historical migrations must not be applied to the new database.

The Python-dependent PDF import and job-match analysis, and the independent Ollama text-polish feature, have been retired. Manual resume creation and editing, rich-text formatting, and browser-based PDF export remain. Browser business requests still use Axios through `apps/web/lib/request.ts` and `services/`. Resume CRUD and PDF export now use NestJS and the shared API database. Export still renders Web's `/resume/print` page using Chromium, so the API runtime needs a Chrome/Chromium executable (`PUPPETEER_EXECUTABLE_PATH` can select it) and must reach the Web origin configured as `BETTER_AUTH_URL`. The user still clicks, waits, and downloads; this move does not reduce Chromium's CPU or memory demand on a shared host. The existing production Compose setup has no API service and is not ready for deployment.

API and Web auth tests share a separate, already-migrated local PostgreSQL database named `resume_copilot_test`; root tests run sequentially to avoid concurrent fixture resets. Set `AUTH_TEST_DATABASE_URL` to **that test database only** before running `pnpm test`; tests refuse other database names and clear test-only rows between runs. Never point the test variable at the development or production database. The controlled Google provider in automated tests does not establish real Google interoperability. Full lint remains blocked by pre-existing Web errors.
