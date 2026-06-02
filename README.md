# AI Equity Research Terminal

Search a stock ticker and get a clean, source-backed research dashboard:
company profile, 5 years of financial statements, key ratios, recent SEC
filings, and a rule-based investment memo — all from official **SEC EDGAR**
data, no API key required.

> **Phase 1 (this build): free tier.** Everything runs off live SEC data with
> no database and no paid APIs. The AI layer (OpenAI summaries, embeddings,
> pgvector Q&A) is planned for Phase 2 — see [Roadmap](#roadmap).

## Stack

| Concern        | Choice                                            |
| -------------- | ------------------------------------------------- |
| App            | Next.js (App Router) + TypeScript                 |
| Styling        | Tailwind CSS v4                                    |
| Data           | SEC EDGAR JSON APIs (submissions + XBRL facts)    |
| Storage        | _Phase 2:_ Supabase Postgres (isolated `equity` schema) + pgvector |
| AI             | _Phase 2:_ OpenAI (summaries, embeddings, Q&A)    |

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
  dashboard/[ticker]/page.tsx   Server-rendered company dashboard
  globals.css                   Tailwind + design tokens
  layout.tsx                    App shell (header + container)
  page.tsx                      Landing + ticker search
components/
  FreeMemo.tsx                  Rule-based investment memo (no LLM)
  MetricCard.tsx                Key-metric tile
  SearchBox.tsx                 Ticker search input
lib/
  sec.ts                        EDGAR client + profile/filings extraction
  financials.ts                 XBRL -> per-year statement line items
  ratios.ts                     Margins, returns, liquidity, leverage, growth
  format.ts                     Shared display formatters
```

## How the data flows

1. `SearchBox` routes to `/dashboard/[ticker]`.
2. The page (a Server Component) calls `getCompanyData(ticker)`, which resolves
   the ticker to a CIK and fetches EDGAR **submissions** (profile + filings) and
   **company facts** (XBRL) in parallel, with cached `fetch`es.
3. `buildAnnualFinancials` parses XBRL into five fiscal years of statements;
   `computeRatios` derives the headline ratios.
4. `FreeMemo` applies transparent thresholds to flag strengths and watch-items.

## Roadmap

**Phase 2 — AI layer (reserved, not built yet):**

- Reuse the **existing Supabase project**; keep all tables in a dedicated
  `equity` Postgres schema (set `?schema=equity` on `DATABASE_URL`) so they
  never collide with the other project's tables. Enable the `vector` extension.
- Prisma models for filings, chunks, and embeddings.
- OpenAI embeddings + `pgvector` for semantic search inside filings.
- OpenAI-generated narrative memo and source-cited Q&A, slotting in beside the
  existing `FreeMemo` with the same props.

## Notes

- SEC EDGAR is rate-limited (~10 req/sec, fair use). Responses are cached and a
  descriptive `User-Agent` is sent on every request per SEC policy.
- Figures are **as reported in XBRL** and may differ from the adjusted /
  non-GAAP numbers companies highlight elsewhere. Informational only — not
  investment advice.
