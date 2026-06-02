/**
 * AI-generated narrative investment memo.
 *
 * Grounded in the computed financial summary, and — if filings have been
 * indexed — in retrieved filing excerpts. Retrieval is best-effort: if the
 * database isn't configured the memo is still produced from the financials
 * alone, so this feature works with just an AI key (no DB required).
 */

import { chatComplete } from "./ai";
import { searchFilings } from "./search";
import type { KeyRatios } from "./ratios";
import type { YearFinancials } from "./financials";
import { formatCurrency, formatDelta, formatPercent } from "./format";

export interface AiMemoResult {
  memo: string;
  grounded: boolean; // true when filing excerpts were used
}

function financialSummary(r: KeyRatios, latest: YearFinancials): string {
  const lines = [
    `Fiscal year: FY${latest.fy}`,
    `Revenue: ${formatCurrency(latest.revenue)} (${formatDelta(r.revenueGrowth)} YoY)`,
    `Net income: ${formatCurrency(latest.netIncome)}`,
    `Gross margin: ${formatPercent(r.grossMargin)}`,
    `Operating margin: ${formatPercent(r.operatingMargin)}`,
    `Net margin: ${formatPercent(r.netMargin)}`,
    `Return on equity: ${formatPercent(r.returnOnEquity)}`,
    `Current ratio: ${r.currentRatio?.toFixed(2) ?? "—"}x`,
    `Debt/equity: ${r.debtToEquity?.toFixed(2) ?? "—"}x`,
    `Free-cash-flow margin: ${formatPercent(r.fcfMargin)}`,
    `Diluted EPS: ${r.epsDiluted ?? "—"}`,
  ];
  return lines.join("\n");
}

const SYSTEM = [
  "You are a sell-side equity analyst writing a brief, balanced investment memo.",
  "Use the financial summary and any filing excerpts provided. Never invent figures.",
  "When you use a filing excerpt, cite it inline as [1], [2], etc.",
  "Structure your answer in markdown with these sections:",
  "**Overview** (2-3 sentences), **Bull case** (3 bullets), **Bear case** (3 bullets), **Bottom line** (one sentence).",
  "End with a final italic line: *Not investment advice.*",
].join(" ");

export async function generateAiMemo(
  ticker: string,
  companyName: string,
  ratios: KeyRatios,
  latest: YearFinancials
): Promise<AiMemoResult> {
  // Best-effort retrieval of qualitative context.
  let chunks: Awaited<ReturnType<typeof searchFilings>> = [];
  try {
    chunks = await searchFilings(
      ticker,
      "business overview strategy competition risks outlook",
      5
    );
  } catch {
    // DB not configured / no filings indexed — fall back to financials only.
    chunks = [];
  }
  const grounded = chunks.length > 0;

  const context = grounded
    ? chunks
        .map((c, i) => `[${i + 1}] (${c.form})\n${c.content}`)
        .join("\n\n")
    : "(No filing text indexed — base the memo on the financial summary only.)";

  const memo = await chatComplete(
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Company: ${companyName} (${ticker})\n\nFinancial summary:\n${financialSummary(
          ratios,
          latest
        )}\n\nFiling excerpts:\n${context}`,
      },
    ],
    { temperature: 0.3, maxTokens: 900 }
  );

  return { memo, grounded };
}
