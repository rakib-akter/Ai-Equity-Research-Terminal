/**
 * Semantic search over stored filing chunks using pgvector.
 *
 * Prisma can't express the `<=>` cosine-distance operator, so retrieval runs as
 * a raw SQL query. We embed the question, then order chunks for the requested
 * ticker by cosine distance and return the closest matches with their source
 * filing metadata for citation.
 */

import { prisma } from "./db";
import { embedQuery } from "./ai";

/** Format a JS number[] as a pgvector literal: [0.1,0.2,...]. */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

export interface RetrievedChunk {
  id: string;
  content: string;
  chunkIndex: number;
  form: string;
  filingDate: string;
  primaryDocUrl: string;
  similarity: number;
}

/**
 * Return the top-k filing chunks most relevant to `query` for one ticker.
 * Returns [] if the ticker has no embedded filings yet.
 */
export async function searchFilings(
  ticker: string,
  query: string,
  k = 6
): Promise<RetrievedChunk[]> {
  const qvec = await embedQuery(query);
  const literal = toVectorLiteral(qvec);

  return prisma.$queryRaw<RetrievedChunk[]>`
    SELECT
      c.id,
      c.content,
      c."chunkIndex"      AS "chunkIndex",
      f.form              AS form,
      f."filingDate"      AS "filingDate",
      f."primaryDocUrl"   AS "primaryDocUrl",
      1 - (c.embedding <=> ${literal}::vector) AS similarity
    FROM equity."FilingChunk" c
    JOIN equity."Filing" f ON f.id = c."filingId"
    WHERE f.ticker = ${ticker.toUpperCase()}
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> ${literal}::vector
    LIMIT ${k}
  `;
}
