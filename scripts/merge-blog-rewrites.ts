/**
 * Merge rewritten journal articles from scripts/blog-rewrites/*.json
 * into scripts/blog-articles.ts, preserving the Rolex women's post.
 *
 * Usage: npx tsx scripts/merge-blog-rewrites.ts
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname);
const REWRITES = path.join(ROOT, "blog-rewrites");
const OUT = path.join(ROOT, "blog-articles.ts");
const KEEP = "rolex-gold-and-silver-watches-for-women";

function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

async function main() {
  const { blogArticles } = await import("./blog-articles");
  const merged: Record<string, string> = { ...blogArticles };

  const files = fs
    .readdirSync(REWRITES)
    .filter((f) => f.endsWith(".json"))
    .sort();

  for (const file of files) {
    const data = JSON.parse(
      fs.readFileSync(path.join(REWRITES, file), "utf8")
    ) as Record<string, string>;
    for (const [slug, body] of Object.entries(data)) {
      if (slug === KEEP) continue;
      if (!body?.trim()) throw new Error(`Empty body for ${slug} in ${file}`);
      merged[slug] = body.trim();
      console.log(`Merged ${slug} from ${file} (${body.length} chars)`);
    }
  }

  const keys = Object.keys(merged).sort((a, b) => {
    if (a === KEEP) return 1;
    if (b === KEEP) return -1;
    return a.localeCompare(b);
  });

  // Keep original key order from blogArticles, then any new
  const ordered = Object.keys(blogArticles).filter((k) => merged[k]);
  for (const k of keys) {
    if (!ordered.includes(k)) ordered.push(k);
  }

  const parts = ordered.map(
    (slug) => `  "${slug}": \`${esc(merged[slug])}\`,`
  );

  const source = `/**
 * Full original journal articles for COSY AURA THE WATCH JOURNAL.
 * Written in-house for the storefront. Not scraped or reproduced from third-party sites.
 * Collecting principles reflect widely published horological guidance; verify each listing before purchase.
 */

export const blogArticles: Record<string, string> = {
${parts.join("\n\n")}
};
`;

  fs.writeFileSync(OUT, source);
  console.log(`Wrote ${ordered.length} articles to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
