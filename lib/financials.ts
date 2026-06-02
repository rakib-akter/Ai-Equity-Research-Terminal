/**
 * Turns raw EDGAR XBRL "company facts" into a tidy, per-fiscal-year view of the
 * three core statements.
 *
 * XBRL is messy: the same line item can be tagged under several us-gaap
 * concepts depending on the filer and year, values are reported many times
 * across filings (originals + comparatives + restatements), and both
 * full-year flows and point-in-time balances live in the same payload. We:
 *   1. try a prioritized list of concept names for each line item,
 *   2. keep only annual figures (10-K / 20-F / 40-F),
 *   3. key everything by the calendar year of the period-end date, and
 *   4. let the most recently filed value win.
 */

import type { CompanyFacts, XbrlConcept } from "./sec";

export interface YearFinancials {
  fy: number;
  // Income statement
  revenue?: number;
  costOfRevenue?: number;
  grossProfit?: number;
  operatingIncome?: number;
  netIncome?: number;
  epsDiluted?: number;
  // Balance sheet
  assets?: number;
  currentAssets?: number;
  liabilities?: number;
  currentLiabilities?: number;
  equity?: number;
  cash?: number;
  longTermDebt?: number;
  // Cash flow
  operatingCashFlow?: number;
  capex?: number;
  freeCashFlow?: number;
}

type Kind = "duration" | "instant";

const ANNUAL_FORMS = new Set(["10-K", "10-K/A", "20-F", "40-F"]);

/** Prioritized us-gaap concept names per line item; first with data wins. */
const CONCEPTS: Record<string, { kind: Kind; names: string[] }> = {
  revenue: {
    kind: "duration",
    names: [
      "RevenueFromContractWithCustomerExcludingAssessedTax",
      "Revenues",
      "SalesRevenueNet",
      "RevenueFromContractWithCustomerIncludingAssessedTax",
    ],
  },
  costOfRevenue: {
    kind: "duration",
    names: ["CostOfRevenue", "CostOfGoodsAndServicesSold", "CostOfGoodsSold"],
  },
  grossProfit: { kind: "duration", names: ["GrossProfit"] },
  operatingIncome: { kind: "duration", names: ["OperatingIncomeLoss"] },
  netIncome: { kind: "duration", names: ["NetIncomeLoss", "ProfitLoss"] },
  epsDiluted: {
    kind: "duration",
    names: ["EarningsPerShareDiluted", "EarningsPerShareBasicAndDiluted"],
  },
  assets: { kind: "instant", names: ["Assets"] },
  currentAssets: { kind: "instant", names: ["AssetsCurrent"] },
  liabilities: { kind: "instant", names: ["Liabilities"] },
  currentLiabilities: { kind: "instant", names: ["LiabilitiesCurrent"] },
  equity: {
    kind: "instant",
    names: [
      "StockholdersEquity",
      "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
    ],
  },
  cash: {
    kind: "instant",
    names: [
      "CashAndCashEquivalentsAtCarryingValue",
      "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
    ],
  },
  longTermDebt: {
    kind: "instant",
    names: ["LongTermDebtNoncurrent", "LongTermDebt"],
  },
  operatingCashFlow: {
    kind: "duration",
    names: [
      "NetCashProvidedByUsedInOperatingActivities",
      "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations",
    ],
  },
  capex: {
    kind: "duration",
    names: [
      "PaymentsToAcquirePropertyPlantAndEquipment",
      "PaymentsToAcquireProductiveAssets",
    ],
  },
};

/** Collect annual {year -> value} for a single concept. */
function annualValues(
  concept: XbrlConcept | undefined,
  kind: Kind
): Map<number, number> {
  const out = new Map<number, number>();
  if (!concept) return out;

  // EPS lives under "USD/shares"; dollar items under "USD".
  const units =
    concept.units["USD"] ??
    concept.units["USD/shares"] ??
    Object.values(concept.units)[0];
  if (!units) return out;

  for (const v of units) {
    if (!ANNUAL_FORMS.has(v.form)) continue;

    if (kind === "duration") {
      if (!v.start) continue;
      const days =
        (Date.parse(v.end) - Date.parse(v.start)) / 86_400_000;
      // Full fiscal year only (allow 52/53-week calendars).
      if (days < 350 || days > 380) continue;
    }

    const year = new Date(v.end).getUTCFullYear();
    // Units are in chronological filing order, so the latest filed value
    // (e.g. a restatement) overwrites earlier ones for the same year.
    out.set(year, v.val);
  }
  return out;
}

/** Resolve a line item by trying its concept fallbacks in order. */
function resolveLineItem(
  facts: CompanyFacts,
  spec: { kind: Kind; names: string[] }
): Map<number, number> {
  const usGaap = facts.facts["us-gaap"] ?? {};
  for (const name of spec.names) {
    const values = annualValues(usGaap[name], spec.kind);
    if (values.size > 0) return values;
  }
  return new Map();
}

/**
 * Build the annual financials table, newest fiscal year first.
 * Derived fields (gross profit, free cash flow) are filled in when the
 * components are present but the company didn't tag them directly.
 */
export function buildAnnualFinancials(
  facts: CompanyFacts,
  maxYears = 5
): YearFinancials[] {
  const resolved: Record<string, Map<number, number>> = {};
  for (const [key, spec] of Object.entries(CONCEPTS)) {
    resolved[key] = resolveLineItem(facts, spec);
  }

  // The set of fiscal years for which we have *any* data.
  const years = new Set<number>();
  for (const map of Object.values(resolved)) {
    for (const y of map.keys()) years.add(y);
  }

  const rows: YearFinancials[] = [...years]
    .sort((a, b) => b - a)
    .slice(0, maxYears)
    .map((fy) => {
      const get = (k: string) => resolved[k]?.get(fy);
      const revenue = get("revenue");
      const costOfRevenue = get("costOfRevenue");
      let grossProfit = get("grossProfit");
      if (
        grossProfit === undefined &&
        revenue !== undefined &&
        costOfRevenue !== undefined
      ) {
        grossProfit = revenue - costOfRevenue;
      }

      const operatingCashFlow = get("operatingCashFlow");
      const capex = get("capex");
      let freeCashFlow: number | undefined;
      if (operatingCashFlow !== undefined && capex !== undefined) {
        // CapEx is reported as a positive outflow; subtract it.
        freeCashFlow = operatingCashFlow - capex;
      }

      return {
        fy,
        revenue,
        costOfRevenue,
        grossProfit,
        operatingIncome: get("operatingIncome"),
        netIncome: get("netIncome"),
        epsDiluted: get("epsDiluted"),
        assets: get("assets"),
        currentAssets: get("currentAssets"),
        liabilities: get("liabilities"),
        currentLiabilities: get("currentLiabilities"),
        equity: get("equity"),
        cash: get("cash"),
        longTermDebt: get("longTermDebt"),
        operatingCashFlow,
        capex,
        freeCashFlow,
      };
    });

  return rows;
}
