/**
 * Fetches a filing's primary document from EDGAR and splits it into overlapping
 * text chunks suitable for embedding.
 *
 * SEC primary docs are large HTML files. We strip tags to plain text and chunk
 * by character count (a cheap, model-agnostic proxy for tokens) with a small
 * overlap so sentences spanning a boundary stay retrievable. We also cap the
 * number of chunks per filing to stay within free-tier embedding limits.
 */

const CHUNK_CHARS = 3500; // ~900 tokens
const CHUNK_OVERLAP = 400;
const MAX_CHUNKS = 120;

function userAgent(): string {
  return (
    process.env.SEC_USER_AGENT?.trim() ||
    "AI Equity Research Terminal contact@example.com"
  );
}

/** Download a filing document and return readable plain text. */
export async function fetchFilingText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": userAgent() },
    next: { revalidate: 86_400 },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch filing (${res.status}): ${url}`);
  }
  const html = await res.text();
  return htmlToText(html);
}

/** Minimal HTML → text: drop scripts/styles/tags and collapse whitespace. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split text into overlapping chunks, capped at MAX_CHUNKS. */
export function chunkText(text: string): string[] {
  const chunks: string[] = [];
  if (!text) return chunks;

  let start = 0;
  while (start < text.length && chunks.length < MAX_CHUNKS) {
    const end = Math.min(start + CHUNK_CHARS, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) chunks.push(chunk);
    if (end >= text.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}
