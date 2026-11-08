# Resume Copilot

A resume builder with structured editing, customizable templates, live multi-page preview, and browser PDF export.

## Project structure

```text
apps/web            Next.js frontend and resume editor (Cloudflare Workers)
apps/api            NestJS API, Better Auth and Drizzle persistence (Cloudflare D1)
packages/contracts  Shared Zod schemas and resume defaults
```

## Getting started

Requires Node.js **24.21.0**, pnpm **12.15.0**, and Google OAuth credentials.

```bash
nvm use
cp -n apps/api/.dev.vars.example apps/api/.dev.vars
cp -n apps/web/.env.example apps/web/.env
pnpm install
pnpm db:migrate
pnpm dev
```

Fill in Google credentials and a unique auth secret in `apps/api/.dev.vars` before starting. Register `http://localhost:3000/api/auth/callback/google` as the local Google callback. D1 migrations run against local SQLite; Docker is not required.

Open <http://localhost:3000>. Use `pnpm dev:web` or `pnpm dev:api` to start either app separately.

## Commands

```bash
pnpm db:generate     # Generate a migration after schema changes
pnpm db:migrate      # Apply migrations to local D1
pnpm test            # Contracts, Web and isolated Workers/D1 tests
pnpm test:e2e        # Chromium core journeys; requires Python with pypdf
pnpm build:cf        # Build both Cloudflare Workers
pnpm lint
pnpm typecheck
```
