import Link from "next/link";
import CompareForm from "@/components/CompareForm";
import { getCompanyData, SecNotFoundError } from "@/lib/sec";
import { buildAnnualFinancials, type YearFinancials } from "@/lib/financials";
import { computeRatios, type KeyRatios } from "@/lib/ratios";
import {
  formatCurrency,
  formatDelta,
  formatEps,
  formatMultiple,
  formatPercent,
} from "@/lib/format";

interface Snapshot {
  ticker: string;
  name: string;
  exchange: string;
  sector: string;
  ratios: KeyRatios;
  latest: YearFinancials;
}

type LoadResult =
  | { ok: true; data: Snapshot }
  | { ok: false; ticker: string; notFound: boolean };

async function loadSnapshot(ticker: string): Promise<LoadResult> {
  try {
    const { profile, facts } = await getCompanyData(ticker);
    const financials = buildAnnualFinancials(facts);
    const ratios = computeRatios(financials);
    if (!ratios || !financials[0]) {
      return { ok: false, ticker, notFound: false };
    }
    return {
      ok: true,
      data: {
        ticker: profile.ticker,
        name: profile.name,
        exchange: profile.exchange,
        sector: profile.sicDescription,
        ratios,
        latest: financials[0],
      },
    };
  } catch (err) {
    return { ok: false, ticker, notFound: err instanceof SecNotFoundError };
  }
}

interface MetricDef {
  label: string;
  get: (s: Snapshot) => number | undefined;
  format: (v?: number) => string;
  higherIsBetter: boolean;
}

const METRICS: MetricDef[] = [
  { label: "Revenue", get: (s) => s.latest.revenue, format: formatCurrency, higherIsBetter: true },
  { label: "Revenue growth", get: (s) => s.ratios.revenueGrowth, format: formatDelta, higherIsBetter: true },
  { label: "Net income", get: (s) => s.latest.netIncome, format: formatCurrency, higherIsBetter: true },
  { label: "Gross margin", get: (s) => s.ratios.grossMargin, format: formatPercent, higherIsBetter: true },
  { label: "Operating margin", get: (s) => s.ratios.operatingMargin, format: formatPercent, higherIsBetter: true },
  { label: "Net margin", get: (s) => s.ratios.netMargin, format: formatPercent, higherIsBetter: true },
  { label: "Return on equity", get: (s) => s.ratios.returnOnEquity, format: formatPercent, higherIsBetter: true },
  { label: "Return on assets", get: (s) => s.ratios.returnOnAssets, format: formatPercent, higherIsBetter: true },
  { label: "Current ratio", get: (s) => s.ratios.currentRatio, format: formatMultiple, higherIsBetter: true },
  { label: "Debt / equity", get: (s) => s.ratios.debtToEquity, format: formatMultiple, higherIsBetter: false },
  { label: "FCF margin", get: (s) => s.ratios.fcfMargin, format: formatPercent, higherIsBetter: true },
  { label: "Diluted EPS", get: (s) => s.ratios.epsDiluted, format: formatEps, higherIsBetter: true },
];

/** Which side wins a metric: "a", "b", or null (tie/missing). */
function winner(
  a: number | undefined,
  b: number | undefined,
  higherIsBetter: boolean
): "a" | "b" | null {
  if (a === undefined || b === undefined || a === b) return null;
  const aWins = higherIsBetter ? a > b : a < b;
  return aWins ? "a" : "b";
}

interface PageProps {
  searchParams: Promise<{ a?: string; b?: string }>;
}

export const metadata = {
  title: "Compare companies — AI Equity Research Terminal",
};

export default async function ComparePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const aTicker = (sp.a ?? "").toUpperCase();
  const bTicker = (sp.b ?? "").toUpperCase();
  const hasBoth = Boolean(aTicker && bTicker);

  const [aRes, bRes] = hasBoth
    ? await Promise.all([loadSnapshot(aTicker), loadSnapshot(bTicker)])
    : [null, null];

  return (
    <div className="space-y-8">
      <section className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Compare two companies
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Put two tickers head to head on the metrics that matter.
        </p>
        <div className="mt-6">
          <CompareForm initialA={aTicker} initialB={bTicker} />
        </div>
      </section>

      {hasBoth && aRes && bRes ? (
        aRes.ok && bRes.ok ? (
          <Comparison a={aRes.data} b={bRes.data} />
        ) : (
          <LoadErrors results={[aRes, bRes]} />
        )
      ) : null}
    </div>
  );
}

function Comparison({ a, b }: { a: Snapshot; b: Snapshot }) {
  let aWins = 0;
  let bWins = 0;
  for (const m of METRICS) {
    const w = winner(m.get(a), m.get(b), m.higherIsBetter);
    if (w === "a") aWins++;
    else if (w === "b") bWins++;
  }

  return (
    <section className="mx-auto max-w-3xl">
      {/* Header with both companies */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <CompanyHead snapshot={a} align="right" />
        <span className="text-xs font-semibold text-slate-600">VS</span>
        <CompanyHead snapshot={b} align="left" />
      </div>

      {/* Leaderboard summary */}
      <p className="mt-4 text-center text-sm text-slate-400">
        <span className="font-semibold text-sky-300">{a.ticker}</span> leads{" "}
        <span className="tabular font-semibold text-slate-200">{aWins}</span> ·{" "}
        <span className="font-semibold text-sky-300">{b.ticker}</span> leads{" "}
        <span className="tabular font-semibold text-slate-200">{bWins}</span>{" "}
        of {METRICS.length} metrics
      </p>

      {/* Metric table */}
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900/70">
              <th className="px-4 py-2.5 text-right font-semibold text-slate-200">
                {a.ticker}
              </th>
              <th className="px-4 py-2.5 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                Metric
              </th>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-200">
                {b.ticker}
              </th>
            </tr>
          </thead>
          <tbody>
            {METRICS.map((m, i) => {
              const av = m.get(a);
              const bv = m.get(b);
              const w = winner(av, bv, m.higherIsBetter);
              return (
                <tr
                  key={m.label}
                  className={i % 2 ? "bg-slate-900/20" : "bg-transparent"}
                >
                  <td
                    className={`tabular px-4 py-2.5 text-right font-medium ${
                      w === "a" ? "text-emerald-400" : "text-slate-300"
                    }`}
                  >
                    {w === "a" ? "▲ " : ""}
                    {m.format(av)}
                  </td>
                  <td className="px-4 py-2.5 text-center text-xs text-slate-500">
                    {m.label}
                  </td>
                  <td
                    className={`tabular px-4 py-2.5 text-left font-medium ${
                      w === "b" ? "text-emerald-400" : "text-slate-300"
                    }`}
                  >
                    {w === "b" ? "▲ " : ""}
                    {m.format(bv)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-center text-xs text-slate-600">
        Latest reported fiscal year (FY{a.ratios.fy} vs FY{b.ratios.fy}).
        Green ▲ marks the stronger figure. Not investment advice.
      </p>
    </section>
  );
}

function CompanyHead({
  snapshot,
  align,
}: {
  snapshot: Snapshot;
  align: "left" | "right";
}) {
  return (
    <Link
      href={`/dashboard/${snapshot.ticker}`}
      className={`block ${align === "right" ? "text-right" : "text-left"}`}
    >
      <div className="text-lg font-bold text-white hover:text-sky-300">
        {snapshot.ticker}
      </div>
      <div className="truncate text-sm text-slate-400">{snapshot.name}</div>
    </Link>
  );
}

function LoadErrors({ results }: { results: LoadResult[] }) {
  const failed = results.filter(
    (r): r is Extract<LoadResult, { ok: false }> => !r.ok
  );
  return (
    <section className="mx-auto max-w-xl rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center">
      {failed.map((f) => (
        <p key={f.ticker} className="text-sm text-slate-300">
          <span className="font-semibold text-white">{f.ticker}</span>:{" "}
          {f.notFound
            ? "no SEC filer found for this ticker."
            : "not enough financial data to compare."}
        </p>
      ))}
      <p className="mt-2 text-xs text-slate-500">
        Check the symbols and try again — only U.S.-listed filers are covered.
      </p>
    </section>
  );
}
