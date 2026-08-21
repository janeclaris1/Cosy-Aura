/**
 * Assert UI dictionary key parity across en/fr/es/pt/de.
 * Run: npx tsx scripts/check-i18n-parity.ts
 */
import { UI_BY_LANG } from "../src/lib/i18n-ui";
import type { UiLang } from "../src/lib/geo-locale";

const langs = Object.keys(UI_BY_LANG) as UiLang[];
const enKeys = new Set(Object.keys(UI_BY_LANG.en));
let failed = false;

for (const lang of langs) {
  if (lang === "en") continue;
  const keys = new Set(Object.keys(UI_BY_LANG[lang]));
  const missing = [...enKeys].filter((k) => !keys.has(k)).sort();
  const extra = [...keys].filter((k) => !enKeys.has(k)).sort();
  if (missing.length || extra.length) {
    failed = true;
    console.error(`[i18n] ${lang}: missing ${missing.length}, extra ${extra.length}`);
    if (missing.length) console.error("  missing:", missing.join(", "));
    if (extra.length) console.error("  extra:", extra.join(", "));
  } else {
    console.log(`[i18n] ${lang}: OK (${keys.size} keys)`);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`[i18n] All languages match en (${enKeys.size} keys).`);
