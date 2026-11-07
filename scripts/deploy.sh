#!/usr/bin/env bash
set -euo pipefail
umask 077

mode="${1:-migrate}"
if [[ "$mode" != migrate && "$mode" != reset ]]; then
  echo "Expected database action migrate or reset." >&2
  exit 1
fi
: "${ALIYUN_REGISTRY:?Set ALIYUN_REGISTRY}"
: "${IMAGE_TAG:?Set IMAGE_TAG}"
export ALIYUN_REGISTRY IMAGE_TAG
directory="${DEPLOY_DIRECTORY:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$directory"
state="$directory/.deploy-state"
mkdir -p "$state" "$directory/backups"
if ! mkdir "$state/lock"; then
  echo "Another deployment is active. Check .deploy-state/lock." >&2
  exit 1
fi

stopped_services=""
destructive_started=false
verify_db=""
compose() { docker compose -f "$directory/docker-compose.prod.yml" "$@"; }
cleanup() {
  result=$?
  if [[ -n "$verify_db" ]]; then
    compose exec -T postgres sh -eu -c 'dropdb --if-exists -U "$POSTGRES_USER" "$1"' sh "$verify_db" >/dev/null 2>&1 || true
  fi
  if [[ "$result" != 0 && "$destructive_started" == false ]]; then
    for service in $stopped_services; do compose start "$service" || true; done
  fi
  rmdir "$state/lock"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if [[ "$mode" == reset && ( -f "$state/database-v2-reset.started" || -f "$state/database-v2-reset.completed" ) ]]; then
  echo "The database reset has already been attempted. Use migrate to resume or review the saved backup." >&2
  exit 1
fi

compose config --quiet
compose pull api app
compose up -d --wait --wait-timeout 60 postgres
target_db=$(compose exec -T postgres printenv POSTGRES_DB)
target_user=$(compose exec -T postgres printenv POSTGRES_USER)
compose run --rm --no-deps api node scripts/migrate.mjs --check-target "$target_db" "$target_user"

if [[ "$mode" == reset ]]; then
  stopped_services=$(compose ps --services --status running app api)
  for service in $stopped_services; do compose stop "$service"; done
  backup="$directory/backups/database-before-v2-$(date -u +%Y%m%dT%H%M%SZ)-$$.dump"
  compose exec -T postgres sh -eu -c 'pg_dump --format=custom --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "$backup.partial"
  test -s "$backup.partial"
  mv "$backup.partial" "$backup"

  verify_db="resume_backup_check_$$"
  compose exec -T postgres sh -eu -c 'createdb -U "$POSTGRES_USER" "$1"' sh "$verify_db"
  compose exec -T postgres sh -eu -c 'pg_restore --exit-on-error --no-owner --no-privileges -U "$POSTGRES_USER" -d "$1"' sh "$verify_db" < "$backup"
  compose exec -T postgres sh -eu -c 'dropdb -U "$POSTGRES_USER" "$1"' sh "$verify_db"
  verify_db=""
  printf '%s\n' "$backup" > "$state/database-v2-reset.started"
  destructive_started=true
  compose exec -T postgres sh -eu -c 'dropdb --force -U "$POSTGRES_USER" "$POSTGRES_DB"; createdb -U "$POSTGRES_USER" --owner="$POSTGRES_USER" "$POSTGRES_DB"'
  echo "Database rebuilt. Verified backup saved at $backup"
fi

compose run --rm --no-deps api node scripts/migrate.mjs
if [[ -f "$state/database-v2-reset.started" ]]; then
  mv "$state/database-v2-reset.started" "$state/database-v2-reset.completed"
fi
compose up -d --wait --wait-timeout 120 api app
compose exec -T app node -e 'Promise.all([["/login",200],["/api/auth/get-session",200],["/api/resumes",401]].map(async ([path,status]) => { const response = await fetch("http://127.0.0.1:3000"+path, { signal: AbortSignal.timeout(10000) }); if (response.status !== status) throw new Error("Web smoke check failed"); })).catch(() => process.exit(1))'
compose ps
