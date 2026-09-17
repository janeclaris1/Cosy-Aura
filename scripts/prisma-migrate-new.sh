#!/usr/bin/env bash
# Create a migration from live DB → schema.prisma without Prisma shadow DB.
# Usage: ./scripts/prisma-migrate-new.sh add_my_column
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

DB_URL="${DIRECT_URL:-${DATABASE_URL:-}}"
if [[ -z "$DB_URL" ]]; then
  echo "ERROR: Set DIRECT_URL or DATABASE_URL in .env"
  exit 1
fi

NAME="${1:?Usage: $0 migration_name}"
STAMP="$(date +%Y%m%d%H%M%S)"
DIR="prisma/migrations/${STAMP}_${NAME}"
TMP="$(mktemp)"

cleanup() {
  rm -f "$TMP"
}
trap cleanup EXIT

npx prisma migrate diff \
  --from-url "$DB_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > "$TMP"

# prisma migrate diff emits this comment when DB already matches schema.prisma
if grep -qE '^-- This is an empty migration\.' "$TMP" || ! grep -qE '(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|GRANT|REVOKE|COMMENT ON|--\s*[^T])' "$TMP"; then
  echo "No schema drift — migration not created."
  exit 0
fi

mkdir -p "$DIR"
mv "$TMP" "$DIR/migration.sql"
trap - EXIT

echo "Created $DIR/migration.sql"
echo "Review the SQL, then run: npx prisma migrate deploy"
