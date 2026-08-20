# Watch → Luxury Perfume Migration

**Branch:** `perfume-migration`  
**Stack:** Next.js 14.2 · Prisma 6 · Neon PostgreSQL · Tailwind · Zustand · npm  
**Status (2026-08-07):** Schema migrated on Neon · catalog reseeded (40 fragrances) · app routes/UI updated · Step 8 validation report in `VALIDATION_STEP8.md` (42/42 automated checks)

## Field mapping (actual schema)

| Watch (old) | Perfume (new) | Notes |
|-------------|---------------|-------|
| `Watch` model | `Fragrance` | Table rename |
| `WatchImage` / `watchId` | `FragranceImage` / `fragranceId` | |
| `OrderItem.watchId` | `OrderItem.fragranceId` | Preserves order history |
| `WishlistItem.watchId` | `WishlistItem.fragranceId` | |
| `movement` | `fragranceFamily` | AUTOMATIC→WOODY, MANUAL→ORIENTAL, QUARTZ→FRESH |
| `caseMaterial` | `bottleMaterial` | STEEL→GLASS, GOLD/PLATINUM→CRYSTAL, … |
| `caseSize` | `bottleSize` (Int) | Parsed then clamped to 30/50/100/200 |
| `strapMaterial` | `capType` | METAL→SPRAY, LEATHER→SCREW, … |
| `dial` | `liquidColor` | |
| `waterResistance` | `longevity` | Mapped to 4-6 / 6-8 / 8-10hrs |
| `hasBox` | `sampleAvailable` | |
| `hasPapers` | `isCrueltyFree` | |
| `gender` | `gender` | Unchanged |
| `model` / `reference` / `category` | same | Unchanged |

**New columns:** `bottleShape`, `concentration`, `topNotes[]`, `heartNotes[]`, `baseNotes[]`, `sillage`, `sustainabilityScore`, `isVegan`

## Step 1 — Database (completed on Neon)

```bash
git checkout perfume-migration
chmod +x scripts/backup-db.sh
./scripts/backup-db.sh   # optional local dump

npm run db:migrate:perfume
# = prisma db execute --schema prisma/schema.prisma \
#   --file prisma/migrations/20260807_migrate_to_perfume/migration.sql

npx prisma generate
npm run db:seed         # perfume catalog; removes remapped watch leftovers
npx prisma studio
```

Validation file: `prisma/migrations/validate_perfume_schema.sql`

### Rollback

```bash
# Prefer full dump restore from backups/
psql "$DATABASE_URL" -f backups/watch_store_TIMESTAMP.sql

# Or scripted reverse (see file for caveats)
psql "$DATABASE_URL" -f prisma/migrations/ROLLBACK_migrate_to_perfume.sql
git checkout main -- prisma/schema.prisma src
npx prisma generate && npx prisma db push
```

In-DB backups from migration: `_backup_Watch`, `_backup_WatchImage`, `_backup_OrderItem`, `_backup_WishlistItem`

## App layer (done)

- [x] `src/lib/fragrances.ts` (+ shim `watches.ts`)
- [x] Routes `/watches` → `/fragrances` (+ redirects in `next.config.mjs`)
- [x] Cart `fragranceId` / persist keys `cosyaura-*`
- [x] Admin forms, filters, PDP specs
- [x] Seed perfume catalog (Chanel–YSL)
- [x] Algolia index name `fragrances`
- [x] Step 8 automated validation (`npm run validate:perfume`, lint, route smoke) — see `VALIDATION_STEP8.md`
- [x] Step 10 premium atelier features — see `STEP10_PREMIUM_FEATURES.md` / `/atelier`
- [ ] Manual UI sign-off (cart, Stripe checkout, mobile, quiz E2E)
- [ ] Blog SEO article bodies still watch-oriented (deferred)
- [ ] Unused watch scrapers left in `src/lib/` (not imported by seed)

## Routes after migration

| Old | New |
|-----|-----|
| `/watches` | `/fragrances` |
| `/watches/[slug]` | `/fragrances/[slug]` |
| `/api/watches` | `/api/fragrances` |
| `/admin/watches` | `/admin/fragrances` |
