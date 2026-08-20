# Google Shopping & Merchant Center — Implementation Guide

Sync Cosy Aura products to **Google Shopping**, **Search free listings**, and **Performance Max** campaigns via a scheduled product feed in [Google Merchant Center](https://merchants.google.com/).

**Status:** Feed is live in code. Add the feed URL in Merchant Center (steps below).

---

## How it works

```
Website database (Prisma)
        ↓
GET /api/feeds/google-shopping?token=…  (CSV feed)
        ↓
Google Merchant Center (scheduled fetch)
        ↓
Google Shopping + Search product listings + Ads
```

| Tool | Purpose |
|------|---------|
| **Product feed** (this guide) | Product listings in Shopping tab & ads |
| **Google Analytics** (already on site) | Traffic & conversion reporting |
| **Merchant Center ↔ GA4 link** | Optional — richer Shopping performance data |
| **Content API for Shopping** | Optional later — push updates on admin save |

Same pattern as Meta: a **feed URL**, not a heavy API integration, for day-to-day catalog sync.

---

## Code already in place

| File | Purpose |
|------|---------|
| `src/lib/product-feed-shared.ts` | Shared title, description, images, pricing helpers |
| `src/lib/google-shopping-feed.ts` | Builds Google Merchant-compatible CSV rows |
| `src/app/api/feeds/google-shopping/route.ts` | Token-protected feed endpoint |
| `src/lib/meta-catalog-feed.ts` | Meta/Facebook feed (shares the same helpers) |

### Google-specific feed fields

- `id`, `title`, `description`, `link`, `image_link`
- `availability` — `in_stock` / `out_of_stock` (Google format)
- `price` — e.g. `118.00 GHS`
- `brand` — always `COSY AURA`
- `condition` — `new`
- `google_product_category` — `479` (Perfume & Cologne)
- `gender`, `size`, `item_group_id` (30/50/100 ml variants)
- `mpn` — internal SKU (`reference` field)
- `identifier_exists` — `no` (no GTIN/barcode for inspired-by oils)
- `age_group` — `adult`
- `canonical_link` — product page URL
- `shipping` — `GH:::0.00 GHS` by default (override with `GOOGLE_SHOPPING_SHIPPING`)

Product pages already emit **Product JSON-LD** (`buildFragranceProductJsonLd` in `src/lib/seo.ts`) for organic Search rich results — separate from Shopping, but complementary.

---

## Environment variables

Add to `.env` and production:

```env
# Long random secret — required in production
GOOGLE_SHOPPING_FEED_TOKEN="your-long-random-token-here"

# Currency in the feed (default: GHS)
GOOGLE_SHOPPING_CURRENCY="GHS"

# Public site URL (used for product links & images)
NEXT_PUBLIC_SITE_URL="https://cosyaura.com"

# Already configured
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-..."
```

### Feed URL (production)

```
https://cosyaura.com/api/feeds/google-shopping?token=YOUR_GOOGLE_SHOPPING_FEED_TOKEN
```

Test locally (dev allows requests without a token):

```bash
curl "http://localhost:3000/api/feeds/google-shopping" | head -5
```

---

## Google Merchant Center setup (do when ready)

### Prerequisites

1. Google account for the business  
2. Verified website (`https://cosyaura.com`) in Merchant Center  
3. Site deployed with `GOOGLE_SHOPPING_FEED_TOKEN` set  
4. Return/refund policy and contact info pages live (`/returns`, `/contact`, `/shipping`)  

### Step 1 — Create Merchant Center account

1. Go to [merchants.google.com](https://merchants.google.com/).  
2. Create account → business name **COSY AURA**.  
3. **Business information** → add website, country (Ghana or primary market), customer service contact.  

### Step 2 — Verify & claim website

1. **Settings** → **Business information** → **Website**.  
2. Verify via **HTML tag** (add to site layout), **Google Analytics**, or **Search Console**.  
3. **Claim** the URL after verification.  

> Search Console is already partially set up (`google-site-verification` in site metadata).

### Step 3 — Add product feed

1. **Products** → **Feeds** → **Add feed**.  
2. Country of sale: your primary market (e.g. Ghana).  
3. Language: English.  
4. Destination: **Shopping ads and free listings**.  
5. Input method: **Scheduled fetch**.  
6. Feed URL:  
   `https://cosyaura.com/api/feeds/google-shopping?token=YOUR_TOKEN`  
7. Fetch frequency: **Daily** (or hourly if available).  
8. File format: **CSV (.csv)**.  

### Step 4 — Shipping & returns

1. **Tools & settings** → **Shipping and returns**.  
2. Add shipping rates/regions (match your `/shipping` page).  
3. Link return policy URL: `https://cosyaura.com/returns`.  

Required before products can serve in Shopping.

### Step 5 — Review & launch

1. **Products** → **All products** — fix errors/warnings.  
2. Request account review if prompted.  
3. Link Merchant Center to **Google Ads** for paid Shopping campaigns (optional).  
4. Enable **free listings** for organic Shopping tab visibility.  

---

## Checklist before going live

- [ ] `GOOGLE_SHOPPING_FEED_TOKEN` set in production  
- [ ] Website verified & claimed in Merchant Center  
- [ ] Feed URL returns valid CSV with token  
- [ ] All image URLs are public `https://` (min ~100×100 px; 800×800+ recommended)  
- [ ] Prices match checkout (Paystack/Stripe)  
- [ ] Stock status reflects real inventory  
- [ ] Shipping & return policies configured in Merchant Center  
- [ ] Titles say **COSY AURA** + **Inspired by …** (trademark policy)  

---

## Meta vs Google — side by side

| | Meta (Facebook Shop) | Google Shopping |
|--|----------------------|-----------------|
| Portal | Commerce Manager | Merchant Center |
| Feed URL | `/api/feeds/meta-catalog` | `/api/feeds/google-shopping` |
| Env token | `META_CATALOG_FEED_TOKEN` | `GOOGLE_SHOPPING_FEED_TOKEN` |
| Availability | `in stock` | `in_stock` |
| Category | Text taxonomy | Numeric ID `479` |
| Checkout | On website | On website |
| Ads tracking | Meta Pixel | Google Ads + GA4 |

You can use the **same product data** — both feeds are generated from your Prisma catalog.

---

## Common Merchant Center errors

| Issue | Fix |
|-------|-----|
| Missing GTIN | Set `identifier_exists: no` + provide `mpn` (already in feed) |
| Image too small | Use bottle photos ≥ 800×800 px |
| Misleading brand | Brand must be COSY AURA, not luxury house names |
| Price mismatch | Align `GOOGLE_SHOPPING_CURRENCY` with checkout |
| Website not claimed | Complete Search Console / HTML verification |
| Missing return policy | Add `/returns` URL in Merchant Center settings |

---

## Future enhancements (optional)

1. **Content API for Shopping** — push product updates when admin saves a fragrance.  
2. **Multi-country feeds** — separate feeds per currency/region (GHS, NGN, USD).  
3. **Supplemental feed** — override titles/images for ads without changing primary feed.  
4. **Local inventory ads** — if you add physical pickup locations.  
5. **Automated diagnostics** — admin page showing last feed status & Merchant Center errors.  

---

## Useful links

- [Google Merchant Center](https://merchants.google.com/)  
- [Product data specification](https://support.google.com/merchants/answer/7052112)  
- [Scheduled fetch setup](https://support.google.com/merchants/answer/6069145)  
- [Perfume category (479)](https://support.google.com/merchants/answer/6324436)  
- [Free listings on Google](https://support.google.com/merchants/answer/9128904)  

---

## Quick reference

| What | Where |
|------|-------|
| Shared feed helpers | `src/lib/product-feed-shared.ts` |
| Google feed builder | `src/lib/google-shopping-feed.ts` |
| Google feed endpoint | `GET /api/feeds/google-shopping` |
| Meta feed endpoint | `GET /api/feeds/meta-catalog` |
| Env example | `.env.example` → `GOOGLE_SHOPPING_*` |
| Organic product schema | `src/lib/seo.ts` → `buildFragranceProductJsonLd` |
| Setup guide (Meta) | `META_FACEBOOK_SHOP.md` |
