# Resume Copilot

A resume workspace for creating, editing, previewing, and exporting independent resumes for different roles. Built with Next.js, shadcn/ui, NestJS, and PostgreSQL. Optional MCP collaboration is under development; no Codex connection or OpenAI API key is needed for manual editing.

## Use the product

Sign in with Google → create a resume → edit with a live preview → download a PDF. Open an existing resume from the dashboard to continue editing. Changes save automatically; failed saves show a retry action. On smaller screens, switch between **Write** and **Page**.

PDF export uses the same document layout as the preview. Click **Download PDF**, wait for generation, and the browser downloads the file. Chromium runs in the API process and can consume substantial CPU and memory on a small server.

## Run locally

Requires Node.js 22 (>=22.12), pnpm 9.15.9, PostgreSQL, a Google OAuth client, and Chrome/Chromium for PDF export.

1. Create `apps/api/.env` from [the API example](apps/api/.env.example) and `apps/web/.env` from [the Web example](apps/web/.env.example), without overwriting existing local files. Never commit secrets.
2. In API configuration, set `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, a unique `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL=http://localhost:3000`. Use `HOST=127.0.0.1` and `PORT=3001` locally. Set `PUPPETEER_EXECUTABLE_PATH` if Chromium is not found at a standard path.
3. In Web configuration, use `BETTER_AUTH_URL=http://localhost:3000` and `API_INTERNAL_URL=http://127.0.0.1:3001`. Web proxies browser requests to NestJS; database credentials and auth secrets belong only in API configuration.
4. Register `http://localhost:3000/api/auth/callback/google` as the Google OAuth redirect URI. Keep PostgreSQL running and apply API migrations to the explicitly selected development database; see [database commands](#database-commands). Do not reset an existing database.

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Web: <http://localhost:3000> · API health: <http://localhost:3001/api/health>

Start either application separately:

```bash
pnpm dev:web
pnpm dev:api
```

## Database commands

NestJS owns the schema and migrations. Run these commands from the repository root:

| Command            | Purpose                                                                      |
| ------------------ | ---------------------------------------------------------------------------- |
| `pnpm db:generate` | Generate a migration from the API schema; review the SQL before applying it. |
| `pnpm db:migrate`  | Apply pending API migrations to the selected database.                       |
| `pnpm db:push`     | Synchronize a disposable database directly, bypassing migration history.     |
| `pnpm db:studio`   | Inspect a trusted local database with Drizzle Studio.                        |

Drizzle reads `DATABASE_URL` from the shell environment, **not automatically from `apps/api/.env`**. Set it explicitly and verify the host/database before running `migrate`, `push`, or `studio`:

```bash
DATABASE_URL='postgresql://USER:PASSWORD@127.0.0.1:5432/resume_copilot' pnpm db:migrate
```

Replace the placeholders with local credentials. Do not use `db:push` on databases maintained through migrations, including existing development/test databases or production. Do not expose Studio publicly or apply old Web migrations; API migrations are in `apps/api/drizzle`.

## Local MCP / plugin trial

The optional plugin currently exposes only `get_connection_status`: platform account ID, display name, and granted scopes. It does **not** read or edit resumes yet. The local Codex plugin installation and tool call were user-confirmed; ordinary Chat integration is not verified.

1. In `apps/api/.env`, set `MCP_ENABLED=true`, `HOST=127.0.0.1`, and `BETTER_AUTH_URL=http://localhost:3000`. The trial rejects production and non-loopback API configuration. Apply any pending API migrations only after confirming the database target.
2. Start API and Web in separate terminals. For this trial, stop any existing Web listener and bind the replacement to loopback:

   ```bash
   # Terminal 1: also builds shared contracts
   pnpm dev:api
   ```

   ```bash
   # Terminal 2
   pnpm --filter @resume-copilot/web exec next dev --hostname 127.0.0.1
   ```

3. Add this repository's root folder as a local plugin marketplace in the desktop client. Select **Resume Copilot (local)** and install `resume-copilot`. The catalog is `.agents/plugins/marketplace.json`; the plugin bundles `http://localhost:3000/api/mcp`. Restart/refresh the client if it does not appear. This follows the [official local marketplace guidance](https://developers.openai.com/plugins/build/plugins#install-a-local-plugin-manually); availability can differ between client surfaces.
4. Authenticate the connection, sign in with Google, review the account and permission, and allow access. No manual token or client secret is required. In a Codex chat, select the plugin and request `get_connection_status`.

Keep the API and Web private: no tunnel or public listener. Use a test account. Production activation and public distribution are not supported by this trial. Report the failed step and error text, never tokens, Cookies, credentials, or complete authorization URLs.

See [plugin troubleshooting](docs/plugin-local-trial.md) and [raw MCP URL diagnostics](docs/mcp-local-trial.md) if installation or authentication fails. Ordinary Chat setup remains a separate acceptance task, not a promised capability of this local plugin.

## Checks

```bash
pnpm format        # Format source and documentation
pnpm format:check  # Check formatting without changing files
pnpm lint
pnpm typecheck
pnpm --filter @resume-copilot/web test
pnpm --filter @resume-copilot/web build
```

Formatting and ESLint run separately. Editor integration is optional; the formatting commands do not require a VS Code extension.

API/root tests require `AUTH_TEST_DATABASE_URL` pointing to an already-migrated database named **`resume_copilot_test` only**. Run `pnpm test` after setting it; tests clear test-only rows. Never use development or production data. Real Google session renewal, ordinary Chat integration and production deployment remain unverified; the existing production Compose setup has no API service.
