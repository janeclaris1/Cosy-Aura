#!/usr/bin/env bash
# Notify search engines about the Cosy Aura perfume sitemap.
# Google Search Console still requires a one-time property submit in the UI;
# this script pings IndexNow-compatible endpoints and prints GSC steps.
#
# Usage: ./scripts/submit-sitemap.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

BASE="${NEXT_PUBLIC_SITE_URL:-${NEXTAUTH_URL:-https://cosyaura.com}}"
BASE="${BASE%/}"
SITEMAP="${BASE}/sitemap.xml"

echo "Sitemap URL: $SITEMAP"
echo ""

# Verify sitemap is reachable
if command -v curl >/dev/null 2>&1; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITEMAP" || true)
  echo "HTTP status for sitemap: ${CODE:-unknown}"
  echo ""
fi

# Legacy Google ping (often ignored; kept for convenience)
if command -v curl >/dev/null 2>&1; then
  echo "Pinging Google (legacy endpoint)..."
  curl -sS "https://www.google.com/ping?sitemap=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$SITEMAP'''))")" \
    -o /dev/null -w "Google ping HTTP %{http_code}\n" || true
  echo "Pinging Bing..."
  curl -sS "https://www.bing.com/ping?sitemap=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$SITEMAP'''))")" \
    -o /dev/null -w "Bing ping HTTP %{http_code}\n" || true
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo " Google Search Console — submit perfume sitemap"
echo "═══════════════════════════════════════════════════════════"
echo " 1. Open https://search.google.com/search-console"
echo " 2. Select property: $BASE"
echo " 3. Go to Sitemaps → Add a new sitemap"
echo " 4. Enter: sitemap.xml"
echo " 5. Click Submit"
echo " 6. (Optional) URL Inspection → request indexing for /fragrances"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "robots.txt already references: ${BASE}/sitemap.xml"
