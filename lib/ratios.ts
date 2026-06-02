/**
 * Derives the headline ratios investors actually scan first — margins,
 * returns, liquidity, leverage, and growth — from the annual financials.
 *
 * Every field is optional: SEC filers don't all tag every line item, so a
 * ratio is only produced when its inputs are present and non-zero. The UI
 * shows "—" for anything missing rather than a misleading zero.
 */

import type { YearFinancials } from "./financials";

export interface KeyRatios {
  fy: number;
  // Profitability
  grossMargin?: number; // %
  operatingMargin?: number; // %
  netMargin?: number; // %
  returnOnEquity?: number; // %
  returnOnAssets?: number; // %
  // Liquidity & leverage
  currentRatio?: number; // x
  debtToEquity?: number; // x
  // Cash
  fcfMargin?: number; // %
  // Growth vs. prior fiscal year
  revenueGrowth?: number; // %
  netIncomeGrowth?: number; // %
  epsDiluted?: number; // $
}

/** Percentage of `part` relative to `whole`, guarding against bad denominators. */
function pct(part?: number, whole?: number): number | undefined {
  if (part === undefined || whole === undefined || whole === 0) return undefined;
  return (part / whole) * 100;
}

/** Ratio of two figures as a multiple (x), guarding the denominator. */
function ratio(num?: number, den?: number): number | undefined {
  if (num === undefined || den === undefined || den === 0) return undefined;
  return num / den;
}

/** Year-over-year growth in percent. */
function growth(current?: number, prior?: number): number | undefined {
  if (current === undefined || prior === undefined || prior === 0)
    return undefined;
  // Use absolute prior so a swing out of a loss reads sensibly.
  return ((current - prior) / Math.abs(prior)) * 100;
}

/**
 * Compute ratios for the most recent fiscal year, using the prior year for
 * growth. Returns null if there are no financials at all.
 */
export function computeRatios(rows: YearFinancials[]): KeyRatios | null {
  if (rows.length === 0) return null;

  const latest = rows[0];
  const prior = rows[1];
  const totalDebt =
    (latest.longTermDebt ?? 0) > 0 ? latest.longTermDebt : undefined;

  return {
    fy: latest.fy,
    grossMargin: pct(latest.grossProfit, latest.revenue),
    operatingMargin: pct(latest.operatingIncome, latest.revenue),
    netMargin: pct(latest.netIncome, latest.revenue),
    returnOnEquity: pct(latest.netIncome, latest.equity),
    returnOnAssets: pct(latest.netIncome, latest.assets),
    currentRatio: ratio(latest.currentAssets, latest.currentLiabilities),
    debtToEquity: ratio(totalDebt, latest.equity),
    fcfMargin: pct(latest.freeCashFlow, latest.revenue),
    revenueGrowth: growth(latest.revenue, prior?.revenue),
    netIncomeGrowth: growth(latest.netIncome, prior?.netIncome),
    epsDiluted: latest.epsDiluted,
  };
}
