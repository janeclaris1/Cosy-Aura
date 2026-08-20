#!/usr/bin/env bash
# Cosy Aura perfume store — Vercel deploy helper (Step 9)
#
# Usage:
#   ./scripts/deploy-vercel.sh           # preview
#   ./scripts/deploy-vercel.sh --prod    # production
#
# Prerequisites:
#   npx vercel login
#   Env vars set in Vercel project (or pulled via `vercel env pull`)

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODE="${1:-}"

echo "→ Production build check"
npm run build

echo ""
echo "→ Required Vercel env vars (set in dashboard or CLI):"
cat <<'EOF'
  DATABASE_URL
  NEXTAUTH_URL                 # https://cosyaura.com in production
  NEXTAUTH_SECRET
  NEXT_PUBLIC_SITE_URL         # https://cosyaura.com
  NEXT_PUBLIC_SITE_NAME        # Luxury Perfumes
  NEXT_PUBLIC_SITE_DESCRIPTION # Artisan fragrances crafted in Grasse
  NEXT_PUBLIC_GA_MEASUREMENT_ID
  STRIPE_SECRET_KEY
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  STRIPE_WEBHOOK_SECRET
  (+ Algolia / Cloudinary / Resend / EasyPost as used)
EOF

echo ""
if [[ "$MODE" == "--prod" ]]; then
  echo "→ Deploying to PRODUCTION"
  npx --yes vercel@latest --prod --yes
else
  echo "→ Deploying PREVIEW"
  npx --yes vercel@latest --yes
fi

echo ""
echo "Post-deploy:"
echo "  1. curl -I https://cosyaura.com"
echo "  2. curl https://cosyaura.com/api/health"
echo "  3. npm run seo:sitemap"
echo "  4. Submit sitemap.xml in Google Search Console"
echo "  5. See DEPLOYMENT_STEP9.md checklist"
