-- Creates the WatchlistItem table to match prisma/schema.prisma.
-- Useful when the direct migration endpoint is unreachable (Supabase
-- disables the IPv6 `db.<ref>.supabase.co` host on some projects) — this
-- runs fine as a single statement over the transaction pooler, or paste it
-- into the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS equity."WatchlistItem" (
  "id"        TEXT NOT NULL,
  "ticker"    TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "exchange"  TEXT,
  "sector"    TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WatchlistItem_ticker_key"
  ON equity."WatchlistItem" ("ticker");
