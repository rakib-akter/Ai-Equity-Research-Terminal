/**
 * Display formatters shared across the dashboard UI. Centralizing these keeps
 * number styling consistent (and tabular) everywhere a figure is shown.
 */

/** Large dollar amounts as compact $ with B/M/K suffixes, e.g. $383.3B. */
export function formatCurrency(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** Percentages with a fixed precision, e.g. 25.3%. */
export function formatPercent(value?: number, digits = 1): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

/** Multiples like current ratio / debt-to-equity, e.g. 1.07x. */
export function formatMultiple(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return `${value.toFixed(2)}x`;
}

/** Plain decimals (e.g. diluted EPS), e.g. $6.13. */
export function formatEps(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return `$${value.toFixed(2)}`;
}

/** A signed percentage with a leading +/− for growth deltas. */
export function formatDelta(value?: number, digits = 1): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}
