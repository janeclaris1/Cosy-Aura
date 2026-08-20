# Step 10 — Bonus Premium Features

**Branch:** `perfume-migration`  
**Hub:** [`/atelier`](/atelier)

All 14 premium experiences are live as first-class UI (client-persisted where personal data is private; no Prisma migration required).

| Feature | Route / surface | Implementation |
|---------|-----------------|----------------|
| AR Try-On | PDP | Camera overlay + bottle image (`ArTryOn`) |
| Scent Memory | PDP + `/scent-journal` | Notes/mood/rating in `cosyaura-premium` Zustand |
| Scent Journal | `/scent-journal` | Wear log from PDP “Log as worn today” |
| Subscription Service | `/subscribe` | Monthly discovery plans → cart |
| Gift Discovery | `/gift-finder` | Personality → scored catalog |
| Seasonal Collections | `/collections` | Season edit + collection shelves |
| Behind the Bottle | `/behind-the-bottle` | Perfumer stories |
| Ingredients Map | `/ingredients` + PDP | SVG origin map |
| Virtual Nose | PDP | Heuristic AI scent descriptor |
| Perfume Compare | `/compare` + tray | Up to 3 bottles side-by-side |
| Scent Profile | `/scent-profile` | Preference atlas |
| Occasion-Based Recs | `/occasions` | Date night / office / weekend… |
| Seasonal Scent Guide | `/seasonal-guide` | Season tips + picks |
| Perfume of the Month | Home | Featured bottle + journal link |

## Key files

- `src/lib/premium-store.ts` — memory, journal, compare, profile
- `src/lib/scent-intelligence.ts` — virtual nose, occasions, seasons, gifts, origins, stories
- `src/components/perfume/*` — feature widgets
- `src/app/atelier` and sibling routes
- Nav: Header **Atelier** dropdown · Footer shop/company links · home strip

## Notes

- Personal data (journal/memory/profile/compare) stays in **localStorage** (`cosyaura-premium`) until account sync is desired.
- Subscriptions add a cart line item (commerce fulfillment can be wired to Stripe recurring later).
- AR uses `getUserMedia` (HTTPS / localhost); falls back with a clear permission message.
- Virtual Nose is curated heuristic copy from notes/family/sillage (no external LLM API).

## Quick QA

1. Open `/atelier` — all feature cards resolve  
2. PDP — Compare, AR, Virtual Nose, Memory, Ingredients map  
3. Add 2+ to compare → tray → `/compare`  
4. `/gift-finder`, `/occasions`, `/seasonal-guide` return product grids  
5. Home shows Premium strip + Perfume of the Month  
