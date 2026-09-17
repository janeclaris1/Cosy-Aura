import { renderHrTemplate } from "@/lib/hr-document-merge";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function looksLikeHtmlBody(text: string): boolean {
  return /<\s*(p|br|strong|em|ul|ol|li|div|h[1-6])\b/i.test(text);
}

/** Plain text with blank lines between paragraphs → HTML for print/preview. */
export function plainTextToDocumentHtml(text: string): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (!paragraphs.length) return "";

  return paragraphs
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

export function formatHrDocumentBodyForDisplay(text: string): string {
  if (looksLikeHtmlBody(text)) return text;
  return plainTextToDocumentHtml(text);
}

/** Convert legacy HTML templates to editable plain text. */
export function htmlBodyToPlainText(html: string): string {
  if (!looksLikeHtmlBody(html)) return html;

  let text = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*\/p\s*>/gi, "\n\n")
    .replace(/<\s*p[^>]*>/gi, "")
    .replace(/<\s*\/strong\s*>/gi, "")
    .replace(/<\s*strong\s*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

export function mergeAndFormatHrDocumentBody(
  body: string,
  fields: Record<string, string>
): string {
  const merged = renderHrTemplate(body, fields);
  return formatHrDocumentBodyForDisplay(merged);
}
