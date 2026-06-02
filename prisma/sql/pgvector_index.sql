-- Run AFTER `prisma migrate` (or `prisma db push`).
--
-- Prisma can't create an index on an Unsupported() column, so we add the
-- pgvector ANN index by hand. HNSW gives fast approximate nearest-neighbour
-- search; vector_cosine_ops matches the cosine distance used in lib/search.ts.
--
-- Run with:
--   psql "$DIRECT_URL" -f prisma/sql/pgvector_index.sql
-- (the npm script `db:index` does this for you).

CREATE INDEX IF NOT EXISTS filing_chunk_embedding_idx
  ON equity."FilingChunk"
  USING hnsw (embedding vector_cosine_ops);
