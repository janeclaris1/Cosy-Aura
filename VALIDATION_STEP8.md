# Step 8 — Testing & Validation Report

**Date:** 2026-08-07  
**Branch:** `perfume-migration`  
**Dev server:** `http://localhost:3000` (verified during this run)

---

## Pre-migration checklist

| Item | Status | Notes |
|------|--------|-------|
| Backup database (`pg_dump` / `npm run db:backup`) | ⚠ Partial | `pg_dump` not installed locally. Script wrote schema note + product JSON: `backups/watch_store_20260807_151105.sql`, `backups/watch_products_20260807_151105.json`. Prefer Neon console export for a full SQL dump before production cutover. |
| Git branch `perfume-migration` | ✅ | Active branch confirmed |
| Export products (`npm run export:products`) | ✅ | `backups/fragrances-export-1786115465615.json` (40 fragrances) |
| `.env` Neon connection | ✅ | Prisma/validation scripts connect successfully |
| Test database connection | ✅ | `npm run validate:perfume` → Neon/Postgres connection OK |

---

## Migration / automated testing

| Command / check | Status | Notes |
|-----------------|--------|-------|
| `npx prisma validate` | ✅ | Schema valid |
| `npx prisma migrate dev --dry-run` | ⏭ N/A | Migration already applied on Neon via SQL file (`20260807_migrate_to_perfume`) |
| `npx prisma migrate dev --name migrate_to_perfume` | ⏭ Done earlier | Do not re-run against production without review |
| `npx prisma db seed` | ✅ | Catalog seeded (40 fragrances, 17 brands) |
| `npx prisma studio` | 🖐 Manual | Open locally to visually confirm rows |
| `npm run test` | ⏭ None | No `test` script in `package.json` |
| `npm run lint` | ✅ | No ESLint warnings or errors |
| Production build | ✅ | Succeeded (prior run; `blog.ts` `matchAll` fix included) |
| `npm run validate:perfume` | ✅ | **42 passed, 0 failed** |
| `npm run dev` | ✅ | Ready; key routes return 200 |

### Validator highlights (`validate:perfume`)

- Fragrance / FragranceImage tables present; Watch table gone  
- 40 products; Midnight Orchid present (EDP, 50ml, notes 3/3/4)  
- Brands, fragranceFamily, OrderItem FKs intact  
- Perfume components, filters, SEO files present  

---

## HTTP / route smoke tests (automated)

| Route | Result |
|-------|--------|
| `/` | 200 — title: *Luxury Perfumes \| Artisan Fragrances from Grasse \| COSY AURA* |
| `/fragrances` | 200 |
| `/fragrances?fragranceFamily=FLORAL` | 200 |
| `/fragrances/noir-parfums-midnight-orchid-noi-midnight-orc-50` | 200 — PDP with notes, sillage, longevity, discovery/layering, Add to Cart |
| `/fragrances/chanel` (brand listing) | 200 — brand SEO title; not a PDP |
| `/fragrance-finder` | 200 — *Fragrance Finder Quiz \| COSY AURA* |
| `/cart`, `/checkout` | 200 |
| `/watches` | 308 → `/fragrances` |
| `/images/og-perfume.png` | 200 |
| `/api/fragrances` | 200 — 40 total |
| API `sillage=MODERATE` | 23 results |
| API `fragranceFamily=FLORAL` | 6 results |
| API `concentration=EDP` | 36 results |
| API `bottleSize=50` | 21 results |

PDP Next.js optimized images: **GET 200** (`image/jpeg`).

---

## UI testing checklist

Interactive browser QA (cart mutations, Stripe checkout, mobile viewport, quiz recommend flow) was **not** fully exercised in-browser. Code + HTTP coverage:

| Item | Status | Evidence |
|------|--------|----------|
| Homepage loads with perfume hero / branding | ✅ Smoke | 200 + perfume title/OG perfume copy |
| Product listing perfume cards | ✅ Smoke | PLP 200; API returns fragrance payloads |
| Filters (new categories) | ✅ Smoke | Correct query keys (`fragranceFamily`, `sillage=MODERATE`, etc.) return filtered totals |
| Product detail perfume specs | ✅ Smoke | Midnight Orchid HTML includes Top/Heart/Base Notes, Sillage, Longevity, EDP, Sustainability |
| Scent pyramid visualizer | ✅ Wired | `ScentPyramid` in `ProductDetail`; Top/Heart/Base Notes in SSR HTML |
| Fragrance quiz | ✅ Wired | `/fragrance-finder` 200; `FragranceQuiz` mounted |
| Cart add/remove | 🖐 Manual | Pages load; Zustand cart uses `fragranceId` / `cosyaura-cart` |
| Checkout | 🖐 Manual | `/checkout` 200; Stripe path needs live keys + payment test |
| Mobile responsive | 🖐 Manual | Existing responsive layout preserved; spot-check in DevTools |
| No 404 on migrated routes | ✅ Smoke | Core routes 200; `/watches` redirects |
| Broken images | ⚠ Spot-check | Optimizer serves product images; rely on Unsplash CDN + `remotePatterns` |
| SEO meta tags | ✅ | Home OG/Twitter perfume copy + `og-perfume.png` |
| Social previews | ✅ Smoke | `og:image` / `twitter:image` → `/images/og-perfume.png` |

---

## Rollback plan

```bash
# Option 1 — Git (local branch only; do not force-push main)
git checkout main
# or discard branch work: git reset --hard main   # destructive; only if intentional

# Option 2 — Database restore (preferred if you have a real pg_dump from Neon)
psql "$DATABASE_URL" -f backups/watch_store_TIMESTAMP.sql
# Neon: restore from console PITR / exported dump if local pg_dump was unavailable

# Option 3 — Scripted reverse migration (see caveats in file)
psql "$DATABASE_URL" -f prisma/migrations/ROLLBACK_migrate_to_perfume.sql
git checkout main -- prisma/schema.prisma
npx prisma generate

# Option 4 — Nuclear reset (wipes data)
npx prisma migrate reset
```

In-DB snapshots from migration (if still present): `_backup_Watch`, `_backup_WatchImage`, `_backup_OrderItem`, `_backup_WishlistItem`.

Product JSON fallback: `backups/fragrances-export-*.json` / `backups/watch_products_*.json`.

---

## Known gaps / follow-ups

1. Install `pg_dump` or export a full dump from Neon console before production.  
2. No automated unit/E2E suite (`npm test` missing) — add Playwright for cart/quiz/checkout if desired.  
3. Manual QA still needed: cart, Stripe checkout, mobile, quiz recommendations end-to-end.  
4. Blog article bodies still watch-oriented (deferred).  
5. Longevity strings in DB are inconsistent (`8-10hrs` vs `8–10 hours`); filter matchers cover most, but normalizing seed data would help.  
6. Submit sitemap in Google Search Console with `NEXT_PUBLIC_SITE_URL=https://cosyaura.com`.

---

## Verdict

**Step 8 automated validation: PASS** (42/42 script checks, lint clean, routes/SEO/filters/PDP smoke OK).  

**Step 8 full UI sign-off: PARTIAL** — complete the manual cart/checkout/mobile/quiz checklist above before treating production as fully verified.
