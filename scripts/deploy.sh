#!/usr/bin/env bash
set -euo pipefail
umask 077

if [[ "$#" != 0 ]]; then
  echo "This deployment accepts no arguments." >&2
  exit 1
fi
: "${ALIYUN_REGISTRY:?Set ALIYUN_REGISTRY}"
: "${IMAGE_TAG:?Set IMAGE_TAG}"
export ALIYUN_REGISTRY IMAGE_TAG
directory="${DEPLOY_DIRECTORY:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$directory"
state="$directory/.deploy-state"
mkdir -p "$state"
if ! mkdir "$state/lock"; then
  echo "Another deployment is active. Check .deploy-state/lock." >&2
  exit 1
fi

compose() { docker compose -f "$directory/docker-compose.prod.yml" "$@"; }
cleanup() {
  result=$?
  rmdir "$state/lock"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

compose config --quiet
compose pull api app
compose up -d --wait --wait-timeout 60 postgres
target_db=$(compose exec -T postgres printenv POSTGRES_DB)
target_user=$(compose exec -T postgres printenv POSTGRES_USER)
compose run --rm --no-deps api node scripts/migrate.mjs --check-target "$target_db" "$target_user"

compose run --rm --no-deps api node scripts/migrate.mjs
compose up -d --wait --wait-timeout 120 api app
compose exec -T app node -e 'Promise.all([["/login",200],["/api/auth/get-session",200],["/api/resumes",401]].map(async ([path,status]) => { const response = await fetch("http://127.0.0.1:3000"+path, { signal: AbortSignal.timeout(10000) }); if (response.status !== status) throw new Error("Web smoke check failed"); })).catch(() => process.exit(1))'
compose ps
