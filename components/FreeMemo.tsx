/**
 * A rule-based investment memo — no LLM, no API key, no cost.
 *
 * It applies a transparent set of thresholds to the computed ratios to surface
 * strengths and watch-items, then states a balanced bottom line. This is the
 * "free" tier; the OpenAI-generated narrative memo is a later phase that can
 * slot in beside this with the same props.
 */

import type { KeyRatios } from "@/lib/ratios";
import type { YearFinancials } from "@/lib/financials";
import { formatCurrency, formatDelta, formatPercent } from "@/lib/format";

interface Signal {
  text: string;
}

function buildSignals(r: KeyRatios): { strengths: Signal[]; watch: Signal[] } {
  const strengths: Signal[] = [];
  const watch: Signal[] = [];

  // Growth
  if (r.revenueGrowth !== undefined) {
    if (r.revenueGrowth >= 10)
      strengths.push({
        text: `Revenue grew ${formatDelta(r.revenueGrowth)} year over year — a healthy top-line expansion.`,
      });
    else if (r.revenueGrowth < 0)
      watch.push({
        text: `Revenue declined ${formatDelta(r.revenueGrowth)} year over year; growth has stalled or reversed.`,
      });
  }

  // Profitability
  if (r.netMargin !== undefined) {
    if (r.netMargin >= 15)
      strengths.push({
        text: `Strong net margin of ${formatPercent(r.netMargin)} — the business keeps a large share of every sales dollar.`,
      });
    else if (r.netMargin < 0)
      watch.push({
        text: `The company is unprofitable, with a net margin of ${formatPercent(r.netMargin)}.`,
      });
  }
  if (r.grossMargin !== undefined && r.grossMargin >= 50)
    strengths.push({
      text: `High gross margin of ${formatPercent(r.grossMargin)} suggests pricing power or a light cost of goods.`,
    });

  // Returns
  if (r.returnOnEquity !== undefined && r.returnOnEquity >= 15)
    strengths.push({
      text: `Return on equity of ${formatPercent(r.returnOnEquity)} indicates efficient use of shareholder capital.`,
    });

  // Liquidity
  if (r.currentRatio !== undefined) {
    if (r.currentRatio >= 1.5)
      strengths.push({
        text: `Comfortable liquidity: a current ratio of ${r.currentRatio.toFixed(2)}x covers short-term obligations.`,
      });
    else if (r.currentRatio < 1)
      watch.push({
        text: `Current ratio of ${r.currentRatio.toFixed(2)}x is below 1.0 — short-term liabilities exceed current assets.`,
      });
  }

  // Leverage
  if (r.debtToEquity !== undefined) {
    if (r.debtToEquity > 2)
      watch.push({
        text: `Elevated leverage: long-term debt is ${r.debtToEquity.toFixed(2)}x equity.`,
      });
    else if (r.debtToEquity <= 0.5)
      strengths.push({
        text: `Conservative balance sheet — long-term debt is only ${r.debtToEquity.toFixed(2)}x equity.`,
      });
  }

  // Cash generation
  if (r.fcfMargin !== undefined) {
    if (r.fcfMargin >= 10)
      strengths.push({
        text: `Generates real cash: free-cash-flow margin of ${formatPercent(r.fcfMargin)}.`,
      });
    else if (r.fcfMargin < 0)
      watch.push({
        text: `Free cash flow is negative (${formatPercent(r.fcfMargin)} of revenue); the business is burning cash.`,
      });
  }

  return { strengths, watch };
}

function bottomLine(
  strengthCount: number,
  watchCount: number,
  name: string
): string {
  if (strengthCount >= 3 && watchCount === 0)
    return `On these fundamentals alone, ${name} screens as a high-quality, financially sound business. Valuation and forward guidance — not covered here — still matter before any decision.`;
  if (watchCount >= 3 && strengthCount === 0)
    return `The fundamentals flag several risks at ${name}. Dig into the latest filings for context before drawing conclusions.`;
  return `${name} shows a mix of strengths and watch-items. The data below and the underlying filings should drive any further work.`;
}

export default function FreeMemo({
  companyName,
  ratios,
  latest,
}: {
  companyName: string;
  ratios: KeyRatios | null;
  latest?: YearFinancials;
}) {
  if (!ratios || !latest) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
        Not enough structured financial data was reported to generate a memo.
      </div>
    );
  }

  const { strengths, watch } = buildSignals(ratios);
  const headline = `In FY${latest.fy}, ${companyName} reported ${formatCurrency(
    latest.revenue
  )} in revenue${
    ratios.revenueGrowth !== undefined
      ? ` (${formatDelta(ratios.revenueGrowth)} YoY)`
      : ""
  } and ${formatCurrency(latest.netIncome)} in net income${
    ratios.netMargin !== undefined
      ? `, a ${formatPercent(ratios.netMargin)} net margin`
      : ""
  }.`;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-100">
          Investment Memo
        </h2>
        <span className="rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Rule-based · Free
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-300">{headline}</p>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Strengths
          </h3>
          <ul className="mt-2 space-y-2">
            {strengths.length > 0 ? (
              strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-300">
                  <span className="mt-1 text-emerald-400">▲</span>
                  <span>{s.text}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-slate-500">
                No standout strengths on these thresholds.
              </li>
            )}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-red-400">
            Watch-items
          </h3>
          <ul className="mt-2 space-y-2">
            {watch.length > 0 ? (
              watch.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-300">
                  <span className="mt-1 text-red-400">▼</span>
                  <span>{s.text}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-slate-500">
                No material red flags on these thresholds.
              </li>
            )}
          </ul>
        </div>
      </div>

      <p className="mt-5 border-t border-slate-800 pt-4 text-sm leading-relaxed text-slate-300">
        <span className="font-semibold text-slate-200">Bottom line. </span>
        {bottomLine(strengths.length, watch.length, companyName)}
      </p>

      <p className="mt-3 text-xs text-slate-600">
        Generated from SEC XBRL data using fixed rules. Informational only — not
        investment advice.
      </p>
    </section>
  );
}
