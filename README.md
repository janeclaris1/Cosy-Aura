# COSY AURA - Luxury Fragrance E-Commerce

A luxury perfume and fragrance e-commerce platform built with Next.js 14.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL + Prisma ORM
- **Payments:** Stripe Checkout
- **Search:** Algolia (with database fallback)
- **Auth:** NextAuth.js (admin panel)
- **State:** Zustand (cart & wishlist)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Configure your `.env` with database, Stripe, Algolia, and NextAuth credentials.

4. Push the database schema and seed:

```bash
npx prisma db push
npm run db:seed
```

5. Start the development server:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

### Admin Panel

- URL: [http://localhost:3000/admin](http://localhost:3000/admin)
- Default credentials: `admin@cosyaura.com` / `admin123`

## Features

- **Homepage** with hero carousel, brand strip, category grid, latest arrivals
- **Product Listing** with filters (price, condition, fragrance family, materials, year)
- **Product Detail** with image gallery, zoom, specs, accordions
- **Search** with autocomplete (Algolia or database fallback)
- **Cart** with slide-over drawer and full cart page
- **Checkout** via Stripe with guest checkout
- **Wishlist** with local persistence
- **Admin Panel** for fragrance CRUD and order management
- **SEO** with dynamic metadata, JSON-LD, sitemap

## Project Structure

```
src/
├── app/              # Next.js App Router pages & API routes
├── components/       # React components
│   ├── admin/        # Admin panel components
│   ├── cart/         # Cart drawer
│   ├── home/         # Homepage sections
│   ├── layout/       # Header, Footer
│   ├── products/     # Product cards, filters, PDP
│   └── search/       # Search bar
├── lib/              # Utilities, Prisma, Stripe, Algolia
└── types/            # TypeScript declarations
```

## Algolia Setup

After seeding, sync fragrances to Algolia:

```typescript
import { syncFragrancesToAlgolia } from "@/lib/algolia-sync";
await syncFragrancesToAlgolia();
```

## Stripe Webhook

Configure your Stripe webhook to point to:

```
POST /api/webhooks/stripe
```

Listen for `checkout.session.completed` events.
