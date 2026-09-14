/**
 * Plain-text catalog product descriptions for Cosy Aura imports.
 * No markdown bold, external URLs, or third-party retailer / source-site names.
 */

export function descriptionSection(title: string, bullets: string[]): string {
  const lines = bullets.filter(Boolean).map((b) => `- ${b.trim()}`);
  if (!lines.length) return sanitizeDescriptionText(title);
  return `${sanitizeDescriptionText(title)}\n${lines.join("\n")}`;
}

export function joinDescriptionSections(...parts: string[]): string {
  return parts.map((p) => p.trim()).filter(Boolean).join("\n\n");
}

/** Strip markdown emphasis and raw URLs from source copy. */
export function sanitizeDescriptionText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stripBrandFromText(text: string, brandName: string): string {
  let out = text;
  const tokens = brandName
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 3)
    .sort((a, b) => b.length - a.length);
  for (const token of tokens) {
    const re = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    out = out.replace(re, " ");
  }
  return out.replace(/\s{2,}/g, " ").replace(/\s+([,.])/g, "$1").trim();
}

const LEGACY_SPEC_HEADER =
  /^(Specifications|Technical characteristics|Details|Strap options|Strap & bracelet options|Colourways|Included|Warranty)/i;

/** Opening copy from a legacy import description (before spec blocks). */
export function extractLeadFromLegacyDescription(
  description: string,
  brandName: string
): string {
  const cleaned = sanitizeDescriptionText(description);
  const beforeSpecs = cleaned.split(
    /\n(?=(?:Specifications|Technical characteristics|Details|Strap(?: & bracelet)? options|Colourways|Included|Warranty)\b)/i
  )[0];
  return beforeSpecs
    .split(/\n\n+/)
    .map((p) => stripBrandFromText(p.trim(), brandName))
    .filter((p) => p.length > 12)
    .join("\n\n")
    .trim();
}

/** Bullet lines from legacy spec sections in import descriptions. */
export function extractSpecBulletsFromLegacyDescription(description: string): string[] {
  const cleaned = sanitizeDescriptionText(description);
  const lines = cleaned.split("\n");
  const bullets: string[] = [];
  let inSpecs = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (LEGACY_SPEC_HEADER.test(line)) {
      inSpecs = true;
      continue;
    }
    if (!inSpecs) continue;
    if (LEGACY_SPEC_HEADER.test(line)) continue;
    if (/^[-*•]/.test(line)) {
      bullets.push(line.replace(/^[-*•]\s*/, "").trim());
    } else if (/^[A-Za-z][^:]{0,40}:/.test(line)) {
      bullets.push(line);
    }
  }

  return bullets;
}

function categorizeWatchSpecLine(line: string): "case" | "movement" {
  const l = line.toLowerCase();
  if (
    /movement|calibre|cal\.|caliber|power reserve|battery|quartz|automatic|co-axial|mechaquartz|miyota|vk64|g100|8315|initial|hacking|functions:/i.test(
      l
    )
  ) {
    return "movement";
  }
  return "case";
}

function dedupeLines(lines: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const key = line.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line.trim());
  }
  return out;
}

function conditionLine(condition: string | null | undefined): string {
  switch (condition) {
    case "UNWORN":
      return "New and unworn. Complete set where applicable.";
    case "EXCELLENT":
      return "Pre-owned in excellent condition. Carefully inspected before listing.";
    case "GOOD":
      return "Pre-owned in good condition. Carefully inspected before listing.";
    default:
      return condition ? `Condition: ${condition.replace(/_/g, " ")}.` : "";
  }
}

export type WatchDescriptionInput = {
  model: string;
  reference: string;
  category?: string | null;
  collection?: string | null;
  bottleDetail?: string | null;
  liquidColor?: string | null;
  longevity?: string | null;
  bottleSize?: number | null;
  condition?: string | null;
  lead?: string | null;
  extraCaseLines?: string[];
  extraMovementLines?: string[];
};

export function buildWatchDescription(input: WatchDescriptionInput): string {
  const lead =
    input.lead?.trim() || `${input.model} (reference ${input.reference}).`;

  const caseLines = dedupeLines([
    input.bottleDetail,
    input.liquidColor ? `Dial: ${input.liquidColor}` : null,
    input.bottleSize ? `Case size: ${input.bottleSize} mm` : null,
    input.category ? `Category: ${input.category}` : null,
    input.collection ? `Collection: ${input.collection}` : null,
    ...(input.extraCaseLines ?? []),
  ]);

  const movementLines = dedupeLines([
    input.longevity,
    ...(input.extraMovementLines ?? []),
  ]);

  const condition = conditionLine(input.condition);

  return sanitizeDescriptionText(
    joinDescriptionSections(
      lead,
      caseLines.length ? descriptionSection("Case", caseLines) : "",
      movementLines.length ? descriptionSection("Movement", movementLines) : "",
      condition
    )
  );
}

/** Rebuild a watch description from DB fields plus optional legacy import text. */
export function rebuildWatchDescriptionFromRecord(
  record: WatchDescriptionInput & {
    brandName?: string;
    legacyDescription?: string | null;
  }
): string {
  const legacy = record.legacyDescription ?? "";
  const brandName = record.brandName ?? "";
  const lead =
    record.lead ??
    (legacy
      ? extractLeadFromLegacyDescription(legacy, brandName)
      : undefined);
  const legacySpecs = legacy ? extractSpecBulletsFromLegacyDescription(legacy) : [];
  const extraCaseLines: string[] = [];
  const extraMovementLines: string[] = [];
  for (const line of legacySpecs) {
    const lower = line.toLowerCase();
    if (/^condition:/i.test(line)) continue;
    if (
      record.reference &&
      /^reference:/i.test(line) &&
      lower.includes(record.reference.toLowerCase())
    ) {
      continue;
    }
    if (
      record.collection &&
      /^collection:/i.test(line) &&
      lower.includes(record.collection.toLowerCase())
    ) {
      continue;
    }
    if (categorizeWatchSpecLine(line) === "movement") {
      extraMovementLines.push(line);
    } else {
      extraCaseLines.push(line);
    }
  }

  return buildWatchDescription({
    model: record.model,
    reference: record.reference,
    category: record.category,
    collection: record.collection,
    bottleDetail: record.bottleDetail,
    liquidColor: record.liquidColor,
    longevity: record.longevity,
    bottleSize: record.bottleSize,
    condition: record.condition,
    lead,
    extraCaseLines,
    extraMovementLines,
  });
}
