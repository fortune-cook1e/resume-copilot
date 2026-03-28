# Drizzle Database Development Workflow

## Purpose

This document defines a reusable workflow for database-related feature development in this project, including how to use Drizzle commands in development and production environments.

## Scope

Use this workflow when you change database schema, such as:

- New tables
- New or modified columns
- New indexes or constraints
- Schema refactors

## Environment-Specific Command Strategy

### Development (recommended team workflow)

Use migration files for traceability and collaboration.

1. Update schema definitions in `db/schema.ts`.
2. Generate migration files:

```bash
npx drizzle-kit generate
```

3. Apply pending migrations to local DB:

```bash
npx drizzle-kit migrate
```

4. Verify DB structure if needed:

```bash
npx drizzle-kit studio
```

Why: `generate + migrate` creates versioned SQL files in `drizzle/`, which is reviewable and CI/CD friendly.

### Development (quick local prototyping only)

Use direct schema sync for temporary local experiments.

```bash
npx drizzle-kit push
```

Notes:

- `push` does not generate versioned migration files.
- Avoid using `push` for changes that will be merged by the team.

### Production

Production changes must be deterministic and reproducible.

- Do not use `npx drizzle-kit push`.
- Commit generated migration files from development.
- Apply committed migrations during deployment:

```bash
npx drizzle-kit migrate
```

## Practical Scenarios

### Scenario A: You changed `db/schema.ts` locally

Run:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### Scenario B: You pulled latest code and migration files

Run:

```bash
npx drizzle-kit migrate
```

### Scenario C: You want to quickly test an idea locally

Run:

```bash
npx drizzle-kit push
```

Then convert to migration-based flow before opening a PR.

## Team Rules

- Prefer migration-based workflow for all shared changes.
- Keep migration files committed with the related schema/code changes.
- Run `migrate` in deployment pipelines, never `push`.

## Schema Authoring Conventions

Use these conventions to keep schema code maintainable as the project grows.

### 1) Organize schema by module

Instead of keeping all tables in one large file, split tables by domain/module.

Recommended structure:

```text
db/
	schema/
		auth.schema.ts
		resume.schema.ts
		index.ts
```

Example `db/schema/index.ts`:

```ts
export * from './auth.schema';
export * from './resume.schema';
```

Then update Drizzle config to point to the folder or index file used by your project setup.

### 2) Keep cross-module dependencies explicit

- Define base/auth tables first (for example `user`).
- Reference foreign keys directly with `references(() => user.id, ...)`.
- Avoid circular imports between schema modules.

### 3) Table and column naming

- Use singular table names where already established (`user`, `session`, `resume`).
- Use `snake_case` for DB column names (`created_at`, `user_id`).
- Keep TypeScript field names in `camelCase` mapped to `snake_case` columns when needed.

### 4) Required timestamps and defaults

- Prefer `createdAt` and `updatedAt` on application tables.
- For mutable entities, use `.defaultNow()` where appropriate.
- Keep nullability intentional; avoid nullable fields unless the business case is clear.

### 5) Enum and constrained values

- For finite states (such as visibility/status), use explicit enum constraints in schema.
- Keep enum values stable and migration-safe; avoid renaming values without migration planning.

### 6) Index and uniqueness rules

- Add `unique()` for true business uniqueness (for example `email`, `token`).
- Add indexes for frequent lookup keys (for example foreign keys and search/filter columns).
- Any index/unique change should go through migrations, not manual DB edits.

### 7) Change management rules

- One logical schema change should map to one migration change set.
- Do not edit old migration files that are already shared/applied.
- If you need to fix history, add a new migration instead of rewriting old ones.
