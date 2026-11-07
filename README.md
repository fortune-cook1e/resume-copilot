# Resume Copilot

A resume builder for creating and managing resumes for different roles, with structured editing, customizable templates, live multi-page preview, and PDF export.

## Project structure

```text
apps/web            Next.js frontend and resume editor
apps/api            NestJS API, authentication and PostgreSQL persistence
packages/contracts  Shared Zod schemas and resume defaults
```

## Getting started

Requires Node.js **24.21.0**, pnpm **12.15.0**, Docker, and Google OAuth credentials.

Copy the local configuration files:

```bash
nvm use
cp -n apps/api/.env.example apps/api/.env
cp -n apps/web/.env.example apps/web/.env
```

Fill in the API database connection, Google OAuth credentials and auth secret, then start the project:

```bash
docker compose up -d
pnpm install
node --env-file=apps/api/.env --run db:migrate
pnpm dev
```

Open <http://localhost:3000>.

To start either application separately:

```bash
pnpm dev:web
pnpm dev:api
```
