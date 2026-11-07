# Production deployment

Production uses Next.js Web and NestJS API images from the same Git commit, plus PostgreSQL 16. GitHub Actions builds both targets in the root Dockerfile and publishes commit-specific tags. The API image includes Chromium for compatibility PDF export.

## Configuration

The server needs Docker with Compose supporting `up --wait`, Bash, and registry access. Use the root [.env.example](../.env.example) for the server configuration. Actual credentials, deployment paths and backup locations belong outside the repository.

The workflow uses GitHub Secrets for registry access, SSH access, the deployment directory and the public application URL. Keep `APP_URL` in GitHub Secrets and `BETTER_AUTH_URL` on the server set to the same public HTTPS origin. Google must allow that origin's `/api/auth/callback/google` redirect.

`DATABASE_URL` must name the Compose host `postgres` on port 5432, with the database and user configured by `DB_NAME` and `DB_USER`. URL-encode special characters in the password. Deployment validates this target and connection before applying migrations.

## Releases

Pushes to `master` and manual runs of **Deploy to Aliyun** use the same incremental deployment path. Manual runs accept no database action. The deployment script accepts no arguments and has no database rebuild operation.

The script pulls both release images, waits for PostgreSQL, validates the database target and runs pending API migrations. It then starts API and Web, waits for readiness, and checks the login page, session endpoint and unauthenticated resume access. Failed preflight or migration stops deployment before application replacement. Deployment runs are serialized in GitHub Actions and guarded by a server-side directory lock.

Changing the server `.env` requires redeploying to update container configuration. Changing the build-time public URL also requires updating `APP_URL` in GitHub Secrets and rebuilding the Web image.

## Recovery

The initial database cutover is complete. Existing backups remain outside the repository; regular deployment does not create, restore or delete them. Backup restoration is a separate operator procedure and requires a compatible application release.

A readiness failure fails the workflow. Inspect the deployment logs before retrying. A stale deployment lock after an ungraceful server interruption requires checking that no deployment process is still running before removing the empty lock directory.

## Local verification

Run `node --test scripts/deploy.test.mjs` and `bash -n scripts/deploy.sh` to verify deployment orchestration. Tests use a temporary Docker command boundary to cover incremental migration, rejected legacy arguments, target validation and retry after migration failure. They do not connect to a database or run containers.

Build API packaging with `docker build --target api-runner -t resume-copilot-api:check .` and Web with `docker build --target runner --build-arg NEXT_PUBLIC_APP_URL=https://resume.example.com -t resume-copilot-web:check .`.

The production migration command is `pnpm --filter @resume-copilot/api db:migrate:deploy`. It uses the packaged SQL history and production dependencies. Incompatible migration history is rejected. Development schema generation remains under `db:generate`.
