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
