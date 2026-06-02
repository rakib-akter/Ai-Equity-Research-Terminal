# AI Equity Research Terminal

Search a stock ticker and get a clean, source-backed research dashboard:
company profile, 5 years of financial statements, key ratios, recent SEC
filings, and a rule-based investment memo — all from official **SEC EDGAR**
data, no API key required.

The **free tier** runs entirely off live SEC data — no key, no database. An
optional **AI layer** adds an LLM-written memo and source-backed Q&A over
filings; it's provider-agnostic and works on free tiers (Google Gemini by
default). See [Enabling the AI layer](#enabling-the-ai-layer).

## Stack

| Concern        | Choice                                            |
| -------------- | ------------------------------------------------- |
| App            | Next.js (App Router) + TypeScript                 |
| Styling        | Tailwind CSS v4                                    |
| Data           | SEC EDGAR JSON APIs (submissions + XBRL facts)    |
| Storage (AI)   | Supabase Postgres (isolated `equity` schema) + pgvector |
| Models (AI)    | Any OpenAI-compatible API — Google Gemini free tier by default; Prisma 6 ORM |

## Prerequisites

- **Node.js 18.18+** (this project was verified on Node 24 LTS). If you're on a
  fresh machine, install it from [nodejs.org](https://nodejs.org) and reopen
  your terminal.

## Getting started

```bash
npm install

# Copy the example env and set a real contact email (SEC requires a
# descriptive User-Agent on every request).
cp .env.example .env.local   # PowerShell: copy .env.example .env.local

npm run dev
```

Open <http://localhost:3000>, search a ticker (try `AAPL`), and you'll land on
`/dashboard/AAPL`.

## Project structure

```
app/
  api/{memo,qa,ingest}/route.ts AI endpoints (memo, Q&A, filing indexing)
  dashboard/[ticker]/page.tsx   Server-rendered company dashboard
  globals.css                   Tailwind + design tokens
  layout.tsx                    App shell (header + container)
  page.tsx                      Landing + ticker search
components/
  FreeMemo.tsx                  Rule-based investment memo (no LLM)
  AiMemo.tsx                    On-demand AI narrative memo
  FilingsQA.tsx                 Index filings + source-backed Q&A
  MetricCard.tsx                Key-metric tile
  SearchBox.tsx                 Ticker search input
lib/
  sec.ts                        EDGAR client + profile/filings extraction
  financials.ts                 XBRL -> per-year statement line items
  ratios.ts                     Margins, returns, liquidity, leverage, growth
  format.ts                     Shared display formatters
  ai.ts                         Provider-agnostic embeddings + chat client
  db.ts                         Prisma client singleton
  filings.ts                    Fetch + HTML->text + chunking
  ingest.ts                     Download/chunk/embed/store filings
  search.ts                     pgvector cosine similarity retrieval
  qa.ts                         Source-cited Q&A
  memo.ts                       AI narrative memo
prisma/
  schema.prisma                 Filing + FilingChunk in the equity schema
  sql/pgvector_index.sql        HNSW vector index
```

## How the data flows

1. `SearchBox` routes to `/dashboard/[ticker]`.
2. The page (a Server Component) calls `getCompanyData(ticker)`, which resolves
   the ticker to a CIK and fetches EDGAR **submissions** (profile + filings) and
   **company facts** (XBRL) in parallel, with cached `fetch`es.
3. `buildAnnualFinancials` parses XBRL into five fiscal years of statements;
   `computeRatios` derives the headline ratios.
4. `FreeMemo` applies transparent thresholds to flag strengths and watch-items.

## Enabling the AI layer

The AI memo and Q&A are optional and degrade gracefully — without keys the
dashboard still works and the panels show a hint.

**1. AI key (enables the AI memo).** Get a free key at
[aistudio.google.com/apikey](https://aistudio.google.com/apikey) and set it in
`.env.local`:

```ini
AI_API_KEY="<your-gemini-key>"
# Base URL + model defaults already target Gemini (see .env.example).
```

The **AI memo** works with just this — no database needed.

**2. Database (enables source-backed Q&A).** Reuse your existing Supabase
project; all tables live in an isolated `equity` schema.

- In Supabase: **Database → Extensions → enable `vector`**.
- Add the two connection strings to `.env.local` (see `.env.example`):
  `DATABASE_URL` (pooled, 6543) and `DIRECT_URL` (direct, 5432), each with
  `?schema=equity`.
- Create the tables and the vector index:

  ```bash
  npm run db:push      # creates the equity.Filing / equity.FilingChunk tables
  npm run db:index     # adds the pgvector HNSW index (needs psql on PATH)
  ```

  > No `psql`? Paste the contents of `prisma/sql/pgvector_index.sql` into the
  > Supabase SQL editor instead.

Then on any dashboard: **Index latest filings** once per company, and ask
questions — answers cite the SEC documents they came from.

**Switching providers** (OpenAI, Ollama, Groq): change the `AI_*` env vars in
`.env.example`. If the embedding dimension changes, update `vector(N)` in
`prisma/schema.prisma`, re-run `db:push`, and re-index filings.

## Notes

- SEC EDGAR is rate-limited (~10 req/sec, fair use). Responses are cached and a
  descriptive `User-Agent` is sent on every request per SEC policy.
- Figures are **as reported in XBRL** and may differ from the adjusted /
  non-GAAP numbers companies highlight elsewhere. Informational only — not
  investment advice.
