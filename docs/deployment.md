# Production deployment

Production uses two images from the same Git commit, Next.js Web and NestJS API, plus PostgreSQL 16. GitHub Actions builds both targets in the root Dockerfile and publishes commit-specific tags. Web reaches API at `http://api:3001`; the public entry remains port 3005. The API image includes Chromium for compatibility PDF export.

## Server setup

The server needs Docker with Compose supporting `up --wait`, Bash, and registry access. Copy the root [.env.example](../.env.example) to `.env` in the directory configured by `ALIYUN_APP_DIR`, then replace the placeholders. Keep `APP_URL` in GitHub Secrets and `BETTER_AUTH_URL` on the server set to the same public HTTPS origin. Google must allow that origin's `/api/auth/callback/google` redirect.

The workflow uses the existing secrets `ALIYUN_REGISTRY`, `ALIYUN_REGISTRY_USERNAME`, `ALIYUN_REGISTRY_PASSWORD`, `ALIYUN_HOST`, `ALIYUN_SSH_USER`, `ALIYUN_SSH_PASSWORD`, optional `ALIYUN_SSH_PORT`, `ALIYUN_APP_DIR`, and `APP_URL`. Registry credentials must permit pushing and pulling the `resume-copilot` repository.

The database URL must name the Compose host `postgres` on port 5432, with the database and user configured by `DB_NAME` and `DB_USER`. URL-encode special characters in the password within `DATABASE_URL`. Deployment checks this target and connection before stopping an application or rebuilding a database.

## First deployment of this version

The agreed cutover discards the previous accounts, sessions and resumes. The new migration history differs from the old master history. A normal release against that old database fails before migrations are applied.

1. Prepare the server's `.env` and merge the deployment changes to `master`.
2. In GitHub Actions, open **Deploy to Aliyun**, choose **Run workflow**, select `master`, and set `database_action` to `reset`.
3. The workflow pulls both release images and checks the database target.
4. The script stops the application's existing containers, writes a private custom-format dump under `backups/`, and restores it into a temporary database. A failed dump or restore stops the cutover and starts the previous application containers.
5. After successful backup verification, it records `.deploy-state/database-v2-reset.started`, drops and recreates only the configured application database, and applies the API migrations.
6. It renames the state record to `database-v2-reset.completed`, starts API and Web, waits for database readiness, and checks the login page.

Keep the backup and both state records private. The production PostgreSQL volume has the existing name `resume-copilot-pgdata-prod`; rebuilding the application database does not remove that volume. Temporary verification databases are removed when the script exits.

## Subsequent releases

Pushes to `master` and manual runs default to `database_action=migrate`. They run pending migrations and start the selected commit's images, without taking the reset path. Deployment runs are serialized in GitHub Actions and guarded by a server-side directory lock.

The script rejects another `reset` if a reset-started or reset-completed record exists. If initialization fails after the rebuild, inspect the failure and rerun with `migrate`; this resumes initialization without dropping the database again. A readiness failure fails the workflow and preserves the backup and state for diagnosis.

## Recovery

A backup can be restored using PostgreSQL 16's `pg_restore`. Stop application containers before restoring into the application database. Restore into a separate temporary database first to inspect the desired recovery state. A backup of the old schema requires the old application's compatible image and configuration.

A stale `.deploy-state/lock` after an ungraceful server interruption requires checking that no deployment process is still running before removing the empty lock directory. Reset state records require operator review; deleting them enables another destructive cutover.

## Local verification

Run `node --test scripts/deploy.test.mjs` and `bash -n scripts/deploy.sh` to verify deployment orchestration. The tests provide a temporary Docker command boundary and cover normal migration, backup-before-reset ordering, refusal of repeated reset, and recovery when backup verification fails. Build API packaging with `docker build --target api-runner -t resume-copilot-api:check .` and Web with `docker build --target runner --build-arg NEXT_PUBLIC_APP_URL=https://resume.example.com -t resume-copilot-web:check .`.

The production migration command is `pnpm --filter @resume-copilot/api db:migrate:deploy`. It uses the packaged SQL history and production dependencies. Development schema generation remains under `db:generate`.
