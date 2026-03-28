# Resume Copilot - Development Commands Reference

## Docker

```bash
# Start PostgreSQL database (background)
docker compose up -d

# Stop database
docker compose down

# Stop and remove data volumes (⚠️ destroys all data)
docker compose down -v

# View database container logs
docker logs resume-copilot-db

# Connect to database via psql
docker exec -it resume-copilot-db psql -U resume -d resume_copilot
```

## Drizzle Kit (Database Migrations)

Drizzle Kit is the CLI companion for Drizzle ORM, used to manage database schema and migrations.

Config file: `drizzle.config.ts`

```bash
# Push schema directly to database (development, no migration files)
npx drizzle-kit push

# Generate SQL migration files from schema changes
npx drizzle-kit generate

# Apply pending migration files to the database
npx drizzle-kit migrate

# Open Drizzle Studio (visual database browser at https://local.drizzle.studio)
npx drizzle-kit studio

# Pull existing database schema into Drizzle schema file
npx drizzle-kit pull

# Check for schema drift between code and database
npx drizzle-kit check
```

**`push` vs `generate` + `migrate`:**
- `push` — Quick & direct, great for local development. No migration files generated.
- `generate` + `migrate` — Creates versioned SQL migration files in `./drizzle/`. Use this for production deployments where you need reproducible, trackable migrations.

## Next.js

```bash
# Start development server (with Turbopack)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run ESLint
pnpm lint
```

## Better Auth

Better Auth handles authentication via API routes at `/api/auth/[...all]`.

```bash
# Generate Drizzle schema from Better Auth's required tables
npx @better-auth/cli generate

# Run Better Auth migrations directly
npx @better-auth/cli migrate
```

> In this project we manually defined the schema in `db/schema.ts` and used `drizzle-kit push`, so the Better Auth CLI is not strictly needed.

## pnpm (Package Manager)

```bash
# Install all dependencies
pnpm install

# Add a runtime dependency
pnpm add <package>

# Add a dev dependency
pnpm add -D <package>

# Remove a dependency
pnpm remove <package>
```

## Environment Variables

Defined in `.env.local` (auto-loaded by Next.js) and `.env` (for drizzle-kit via `dotenv/config`):

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Secret key for signing auth tokens/cookies |
| `BETTER_AUTH_URL` | App base URL (used by Better Auth) |

## Project Architecture Overview

```
db/
  schema.ts         ← Drizzle table definitions (user, session, account, verification)
  index.ts          ← Drizzle client instance

lib/
  auth.ts           ← Better Auth server config (drizzle adapter, email+password)
  auth-client.ts    ← Better Auth client hooks (signIn, signUp, signOut, useSession)
  request.ts        ← Axios instance with interceptors

types/
  auth/             ← Zod schemas & types for auth forms (loginSchema, registerSchema)
  resume/           ← Resume type definitions

app/
  api/auth/[...all] ← Better Auth catch-all API route
  (auth)/login/     ← Login page
  (auth)/register/  ← Register page

middleware.ts       ← Route protection (checks session cookie)
drizzle.config.ts   ← Drizzle Kit configuration
docker-compose.yml  ← PostgreSQL service
```
