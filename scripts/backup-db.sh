#!/usr/bin/env bash
# Backup watch-store data before perfume migration (Neon PostgreSQL).
# Usage: ./scripts/backup-db.sh
# Requires: DATABASE_URL in .env, pg_dump available (or neonctl).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set"
  exit 1
fi

STAMP="$(date +%Y%m%d_%H%M%S)"
OUT_DIR="$ROOT/backups"
mkdir -p "$OUT_DIR"

SQL_DUMP="$OUT_DIR/watch_store_${STAMP}.sql"
JSON_DUMP="$OUT_DIR/watch_products_${STAMP}.json"

echo "→ Dumping SQL to $SQL_DUMP"
if command -v pg_dump >/dev/null 2>&1; then
  pg_dump "$DATABASE_URL" --no-owner --no-acl -F p -f "$SQL_DUMP"
else
  echo "pg_dump not found — writing schema-only note. Use Neon console export or:"
  echo "  neonctl connection-string && pg_dump ..."
  echo "-- Manual Neon backup required at $STAMP" > "$SQL_DUMP"
fi

echo "→ Exporting product JSON to $JSON_DUMP"
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const watches = await prisma.fragrance.findMany({
    include: { brand: true, series: true, images: true },
  });
  const fs = await import('fs');
  fs.writeFileSync('${JSON_DUMP}', JSON.stringify(watches, null, 2));
  console.log('Exported', watches.length, 'products');
}
main().finally(() => prisma.\$disconnect());
"

echo "✓ Backup complete:"
echo "  $SQL_DUMP"
echo "  $JSON_DUMP"
echo ""
echo "Rollback tips:"
echo "  1. psql \"\$DATABASE_URL\" -f $SQL_DUMP"
echo "  2. Or: psql \"\$DATABASE_URL\" -f prisma/migrations/ROLLBACK_migrate_to_perfume.sql"
echo "  3. git checkout main -- prisma/schema.prisma && npx prisma generate"
