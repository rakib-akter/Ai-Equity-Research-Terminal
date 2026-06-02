/**
 * Provider-agnostic AI client.
 *
 * We talk to the model through the OpenAI SDK, but point it at any
 * OpenAI-*compatible* endpoint via env vars. Default is Google Gemini's free
 * tier (chat + embeddings). To switch providers later you only change env:
 *
 *   Gemini (default):
 *     AI_API_KEY=<your Gemini key>
 *     AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
 *     AI_CHAT_MODEL=gemini-2.0-flash
 *     AI_EMBEDDING_MODEL=gemini-embedding-001  (request 768 dims)
 *
 *   OpenAI:
 *     AI_API_KEY=sk-...
 *     AI_BASE_URL=https://api.openai.com/v1
 *     AI_CHAT_MODEL=gpt-4o-mini
 *     AI_EMBEDDING_MODEL=text-embedding-3-small  (1536 dims)
 *
 *   Ollama (local):
 *     AI_API_KEY=ollama
 *     AI_BASE_URL=http://localhost:11434/v1
 *     AI_CHAT_MODEL=llama3.1
 *     AI_EMBEDDING_MODEL=nomic-embed-text   (768 dims)
 *
 * IMPORTANT: AI_EMBEDDING_DIM must match the pgvector column width in the
 * Prisma schema. Changing embedding models means re-embedding everything.
 */

import OpenAI from "openai";

const DEFAULTS = {
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  chatModel: "gemini-2.5-flash",
  embeddingModel: "gemini-embedding-001",
  embeddingDim: 768,
};

/** The embedding vector width. Keep in sync with prisma/schema.prisma. */
export const EMBEDDING_DIM = Number(
  process.env.AI_EMBEDDING_DIM ?? DEFAULTS.embeddingDim
);

export const CHAT_MODEL = process.env.AI_CHAT_MODEL ?? DEFAULTS.chatModel;
export const EMBEDDING_MODEL =
  process.env.AI_EMBEDDING_MODEL ?? DEFAULTS.embeddingModel;

/** True when an API key is configured — lets the UI degrade gracefully. */
export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY?.trim());
}

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!isAiConfigured()) {
    throw new Error(
      "AI is not configured. Set AI_API_KEY (and optionally AI_BASE_URL / model names) in .env.local."
    );
  }
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.AI_API_KEY!,
      baseURL: process.env.AI_BASE_URL ?? DEFAULTS.baseURL,
    });
  }
  return client;
}

// Free embedding tiers cap tokens-per-minute, so we send small sub-batches
// with a short pause between them and back off on rate-limit (429) errors.
const EMBED_SUBBATCH = 5;
const EMBED_PAUSE_MS = 1200;
const MAX_RETRIES = 5;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRateLimit(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    (err as { status?: number }).status === 429
  );
}

async function embedSubbatch(
  batch: string[],
  attempt = 0
): Promise<number[][]> {
  try {
    const res = await getClient().embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      // Pin the output width so it matches the pgvector column. Gemini's
      // gemini-embedding-001 defaults to 3072 (too wide for an HNSW index).
      dimensions: EMBEDDING_DIM,
    });
    // The API returns items with an `index`; sort to guarantee input order.
    return res.data
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding as number[]);
  } catch (err) {
    if (isRateLimit(err) && attempt < MAX_RETRIES) {
      // Exponential backoff: 5s, 10s, 20s, 40s, 80s.
      await sleep(5000 * 2 ** attempt);
      return embedSubbatch(batch, attempt + 1);
    }
    throw err;
  }
}

/**
 * Embed an arbitrary number of texts, in order. Internally throttled into
 * small sub-batches so it stays within free-tier rate limits.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_SUBBATCH) {
    const batch = texts.slice(i, i + EMBED_SUBBATCH);
    out.push(...(await embedSubbatch(batch)));
    if (i + EMBED_SUBBATCH < texts.length) await sleep(EMBED_PAUSE_MS);
  }
  return out;
}

/** Embed a single query string. */
export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text]);
  return vec;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Run a chat completion and return the assistant's text. */
export async function chatComplete(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const res = await getClient().chat.completions.create({
    model: CHAT_MODEL,
    messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens,
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}
