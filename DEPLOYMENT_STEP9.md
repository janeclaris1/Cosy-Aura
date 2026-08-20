# Step 9 — Deployment Report

**Date:** 2026-08-07  
**Branch:** `perfume-migration`  
**Target:** Vercel → `https://cosyaura.com`  
**Git remote:** `https://github.com/janeclaris1/watchstore.git`

---

## Pre-deploy status

| Check | Status | Notes |
|-------|--------|-------|
| `npm run build` | ✅ | Compiled; 114 pages; `/fragrances`, `/fragrance-finder`, perfume PDP SSG |
| Lint / types | ✅ | Included in build |
| Vercel CLI | ⚠ Auth required | CLI 58.7.1; **no credentials** — login flow started |
| Project link (`.vercel`) | ❌ | Not linked yet (first deploy will create/link) |
| Local `.env` perfume public vars | ✅ | `NEXT_PUBLIC_SITE_URL`, `SITE_NAME`, `SITE_DESCRIPTION`, GA id |
| Local `NEXTAUTH_URL` | ℹ localhost | Correct for local; **must be `https://cosyaura.com` on Vercel** |

---

## Environment variables (set in Vercel → Project → Settings → Environment Variables)

Use **Production** (and Preview if needed):

```text
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
NEXTAUTH_URL=https://cosyaura.com
NEXTAUTH_SECRET=<same strong secret as production>
NEXT_PUBLIC_SITE_URL=https://cosyaura.com
NEXT_PUBLIC_SITE_NAME=Luxury Perfumes
NEXT_PUBLIC_SITE_DESCRIPTION=Artisan fragrances crafted in Grasse
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-SNL8Y1TBSQ
STRIPE_SECRET_KEY=sk_live_...   # or sk_test_... until go-live
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Also mirror any keys you already use: Algolia, Cloudinary, Resend, EasyPost, Pexels.

App code now reads `NEXT_PUBLIC_SITE_NAME` / `NEXT_PUBLIC_SITE_DESCRIPTION` via `src/lib/seo.ts` (defaults remain COSY AURA / Grasse copy if unset).

Template: `.env.example`  
Deploy helper: `scripts/deploy-vercel.sh` (`--prod` for production)

---

## Deploy commands (after login)

```bash
# 1) Authenticate (browser)
npx vercel login

# 2) Preview
npm run build
npx vercel          # or: ./scripts/deploy-vercel.sh

# 3) Production
npx vercel --prod   # or: ./scripts/deploy-vercel.sh --prod
```

On first run, link/create the Vercel project (prefer existing Cosy Aura project if one already serves `cosyaura.com`).

### Sync env from local (optional, careful with secrets)

```bash
# Push individual vars (example)
npx vercel env add NEXT_PUBLIC_SITE_NAME production
npx vercel env add NEXT_PUBLIC_SITE_DESCRIPTION production
npx vercel env add NEXT_PUBLIC_SITE_URL production
```

Or set them in the Vercel dashboard, then redeploy.

---

## Post-deployment checklist

| Item | How to verify | Status |
|------|----------------|--------|
| Live site loads | Open `https://cosyaura.com` | ⏳ Pending deploy |
| Database connection | `GET /api/health` → DB ok | ⏳ |
| All pages accessible | `/`, `/fragrances`, PDP, `/fragrance-finder`, `/cart`, `/checkout` | ⏳ |
| Images load | PDP + OG `/images/og-perfume.png` | ⏳ |
| Payment processing | Stripe test checkout + webhook to prod URL | ⏳ Manual |
| Analytics tracking | GA4 `G-SNL8Y1TBSQ` + consent banner | ⏳ Confirm Realtime after consent |
| Sitemap → Search Console | `npm run seo:sitemap` then GSC → Sitemaps → `sitemap.xml` | ⏳ Manual GSC |
| Social previews | [opengraph.xyz](https://www.opengraph.xyz/) / Facebook debugger on home + PDP | ⏳ |
| Load time &lt; 3s | Lighthouse / WebPageTest on home | ⏳ |

### Quick smoke after prod URL is live

```bash
curl -sI https://cosyaura.com | head -5
curl -s https://cosyaura.com/api/health
curl -sI https://cosyaura.com/fragrances
curl -sI https://cosyaura.com/images/og-perfume.png
curl -sI https://cosyaura.com/sitemap.xml
npm run seo:sitemap
```

### Stripe webhook (production)

Point Stripe webhook endpoint to:

`https://cosyaura.com/api/webhooks/stripe`

Events: `checkout.session.completed` (and any others you already handle). Update `STRIPE_WEBHOOK_SECRET` on Vercel after creating the endpoint.

---

## Blocker — action required

Vercel device login was started. Complete auth in the browser (code may expire — re-run `npx vercel login` if needed), then reply **continue deploy**.

**https://vercel.com/oauth/device?user_code=PJTZ-RHRS**

On Vercel production env, set at minimum:

- `NEXTAUTH_URL=https://cosyaura.com` (do not use localhost)
- `NEXT_PUBLIC_SITE_URL=https://cosyaura.com`
- `NEXT_PUBLIC_SITE_NAME=Luxury Perfumes`
- `NEXT_PUBLIC_SITE_DESCRIPTION=Artisan fragrances crafted in Grasse`
- `DATABASE_URL` + Stripe + `NEXTAUTH_SECRET` (+ GA / Algolia / email as needed)

---

## Rollback

- Vercel → Deployments → promote previous production deployment  
- Or: `npx vercel rollback`  
- Database: see `VALIDATION_STEP8.md` / `MIGRATION_PERFUME.md` rollback section (Neon dump / `ROLLBACK_migrate_to_perfume.sql`)
