/**
 * Ingestion: download a company's most recent filings, chunk them, embed the
 * chunks, and store them in Postgres/pgvector for semantic search.
 *
 * Embeddings are written with raw SQL because the `vector` column is an
 * Unsupported() Prisma type. We re-embed idempotently: an existing filing's
 * chunks are replaced so re-running stays consistent.
 */

import { randomUUID } from "crypto";
import { prisma } from "./db";
import { embedTexts } from "./ai";
import { getCompanyData } from "./sec";
import { fetchFilingText, chunkText } from "./filings";
import { toVectorLiteral } from "./search";

const INGEST_FORMS = ["10-K", "10-Q"];
const MAX_FILINGS = 2; // newest annual + quarterly, to respect free-tier limits
const EMBED_BATCH = 50;

export interface IngestResult {
  ticker: string;
  filingsIndexed: number;
  chunksIndexed: number;
}

/** Whether this ticker already has at least one embedded filing. */
export async function isTickerIndexed(ticker: string): Promise<boolean> {
  const count = await prisma.filing.count({
    where: { ticker: ticker.toUpperCase() },
  });
  return count > 0;
}

/** Download, chunk, embed and store the latest filings for a ticker. */
export async function ingestFilings(ticker: string): Promise<IngestResult> {
  const t = ticker.toUpperCase();
  const { profile, filings } = await getCompanyData(t);

  const targets = filings
    .filter((f) => INGEST_FORMS.includes(f.form))
    .slice(0, MAX_FILINGS);

  let filingsIndexed = 0;
  let chunksIndexed = 0;

  for (const f of targets) {
    const text = await fetchFilingText(f.documentUrl);
    const chunks = chunkText(text);
    if (chunks.length === 0) continue;

    // Upsert the parent filing row.
    const filing = await prisma.filing.upsert({
      where: { accessionNumber: f.accessionNumber },
      create: {
        cik: profile.cik,
        ticker: t,
        accessionNumber: f.accessionNumber,
        form: f.form,
        filingDate: f.filingDate,
        reportDate: f.reportDate || null,
        title: `${f.form} · ${f.filingDate}`,
        primaryDocUrl: f.documentUrl,
        chunkCount: chunks.length,
      },
      update: {
        chunkCount: chunks.length,
        embeddedAt: new Date(),
      },
    });

    // Replace any prior chunks for an idempotent re-ingest.
    await prisma.filingChunk.deleteMany({ where: { filingId: filing.id } });

    // Embed + insert in batches.
    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      const batch = chunks.slice(i, i + EMBED_BATCH);
      const vectors = await embedTexts(batch);
      for (let j = 0; j < batch.length; j++) {
        const literal = toVectorLiteral(vectors[j]);
        await prisma.$executeRaw`
          INSERT INTO equity."FilingChunk" (id, "filingId", "chunkIndex", content, embedding)
          VALUES (${randomUUID()}, ${filing.id}, ${i + j}, ${batch[j]}, ${literal}::vector)
        `;
      }
      chunksIndexed += batch.length;
    }

    filingsIndexed += 1;
  }

  return { ticker: t, filingsIndexed, chunksIndexed };
}
