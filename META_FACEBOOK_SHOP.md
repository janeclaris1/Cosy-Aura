# Meta Commerce & Facebook Shop — Implementation Guide

Sync Cosy Aura products to **Facebook Shop** and **Instagram Shopping** via a scheduled product catalog feed. This does **not** require the full Facebook Graph API for day-to-day catalog updates.

**Status:** Feed endpoint scaffolded in code. Commerce Manager setup pending.

---

## How it works

```
Website database (Prisma)
        ↓
GET /api/feeds/meta-catalog?token=…  (CSV feed)
        ↓
Meta Commerce Manager (scheduled fetch)
        ↓
Facebook Shop + Instagram Shopping
```

- **Meta Pixel** (already on the site) → ad tracking & conversions  
- **Product feed** (this guide) → product listings in Shop  
- **Graph API** → only needed later for advanced automation (optional)

---

## Code already in place

| File | Purpose |
|------|---------|
| `src/lib/meta-catalog-feed.ts` | Builds Meta-compatible CSV rows from fragrance records |
| `src/app/api/feeds/meta-catalog/route.ts` | Public feed endpoint (token-protected in production) |

### Feed fields exported

- `id`, `title`, `description`, `availability`, `condition`, `price`
- `link`, `image_link`, `brand`, `size`, `gender`
- `item_group_id` (groups 30/50/100 ml variants)
- `google_product_category`, `fb_product_category`, `product_type`
- `additional_image_link` (up to 4 extra images)

### Branding rules (Meta policy)

- **Brand** in the feed is always `COSY AURA` (seller brand).
- Titles/descriptions include **“(Inspired by …)”** so listings are not presented as counterfeit luxury goods.

---

## Environment variables

Add to `.env` (and production host):

```env
# Long random secret — required in production
META_CATALOG_FEED_TOKEN="your-long-random-token-here"

# Price currency in the feed (default: GHS)
META_CATALOG_CURRENCY="GHS"

# Already used for ads (separate from catalog)
NEXT_PUBLIC_META_PIXEL_ID=""
NEXT_PUBLIC_SITE_URL="https://cosyaura.com"
```

### Feed URL (production)

```
https://cosyaura.com/api/feeds/meta-catalog?token=YOUR_META_CATALOG_FEED_TOKEN
```

Test locally (dev allows requests without a token):

```bash
curl "http://localhost:3000/api/feeds/meta-catalog" | head -5
```

---

## Meta Commerce Manager setup (do when ready)

### Prerequisites

1. [Meta Business Manager](https://business.facebook.com/) account  
2. Facebook Page for Cosy Aura  
3. Instagram Business account (linked to the Page)  
4. Site deployed with `META_CATALOG_FEED_TOKEN` set  

### Step 1 — Create a catalog

1. Open [Commerce Manager](https://business.facebook.com/commerce).  
2. **Create catalog** → type **E-commerce** → name e.g. `Cosy Aura Products`.  

### Step 2 — Add a data feed

1. Catalog → **Catalog** → **Data sources** → **Add products**.  
2. Choose **Data feed**.  
3. **Scheduled feed** → **Download** (we provide the URL, not a file).  
4. Feed URL:  
   `https://cosyaura.com/api/feeds/meta-catalog?token=YOUR_TOKEN`  
5. Format: **CSV**  
6. Schedule: **Hourly** or **Daily**  
7. Currency: **GHS** (must match `META_CATALOG_CURRENCY`)  

### Step 3 — Connect sales channels

1. Commerce Manager → **Shops** → connect **Facebook Page** and **Instagram**.  
2. Checkout: **Checkout on another website** → `https://cosyaura.com`  

### Step 4 — Review & publish

1. Open **Catalog** → **Items** and fix any errors/warnings.  
2. Submit for review if prompted (often 24–72 hours).  
3. Enable **Instagram Shopping** and **Facebook Shop** once approved.  

---

## Checklist before going live

- [ ] `META_CATALOG_FEED_TOKEN` set in production `.env`  
- [ ] `NEXT_PUBLIC_SITE_URL` points to live domain  
- [ ] Feed URL returns CSV when opened with correct token  
- [ ] All `image_link` URLs are absolute `https://` and publicly accessible  
- [ ] Prices in feed match checkout prices  
- [ ] Stock (`availability`) reflects real inventory  
- [ ] Meta Pixel firing on product & checkout pages (already wired)  
- [ ] Commerce Manager catalog connected to Page + Instagram  

---

## Common catalog errors

| Issue | Fix |
|-------|-----|
| Image rejected | Use HTTPS, min ~500×500 px, no heavy watermarks |
| Policy violation (luxury brands) | Ensure title says “Inspired by”, brand is COSY AURA |
| Price mismatch | Align `META_CATALOG_CURRENCY` with Paystack/checkout currency |
| Broken link | Confirm `NEXT_PUBLIC_SITE_URL` and `/fragrances/[slug]` routes |
| 401 on feed | Token in URL must match `META_CATALOG_FEED_TOKEN` |

---

## Future enhancements (optional)

Implement later if needed:

1. **Conversions API (CAPI)** — server-side Purchase/AddToCart events (better ad attribution than Pixel alone).  
2. **Multi-currency feeds** — separate feeds or dynamic currency per market.  
3. **Graph API catalog upload** — push single product updates on admin save instead of waiting for scheduled fetch.  
4. **Admin “Sync to Meta” button** — trigger manual catalog refresh from `/admin`.  
5. **XML feed variant** — if Meta or a partner requires Atom/RSS format.  

---

## Useful links

- [Meta Commerce Manager](https://business.facebook.com/commerce)  
- [Catalog feed fields reference](https://developers.facebook.com/docs/marketing-api/catalog/reference)  
- [Meta Pixel setup](https://business.facebook.com/events_manager)  
- [Instagram Shopping requirements](https://www.facebook.com/business/help/instagram/shopping)  

---

## Quick reference

| What | Where |
|------|-------|
| Feed builder | `src/lib/meta-catalog-feed.ts` |
| Feed endpoint | `GET /api/feeds/meta-catalog` |
| Env example | `.env.example` → `META_CATALOG_*` |
| Ad tracking | `src/lib/meta-pixel.ts`, `NEXT_PUBLIC_META_PIXEL_ID` |
