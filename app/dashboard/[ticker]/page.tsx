import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import MetricCard, { type MetricTone } from "@/components/MetricCard";
import FreeMemo from "@/components/FreeMemo";
import AiMemo from "@/components/AiMemo";
import FilingsQA from "@/components/FilingsQA";
import TrendCharts from "@/components/TrendCharts";
import { getCompanyData, SecNotFoundError } from "@/lib/sec";
import { buildAnnualFinancials, type YearFinancials } from "@/lib/financials";
import { computeRatios } from "@/lib/ratios";
import { isAiConfigured } from "@/lib/ai";
import {
  formatCurrency,
  formatDelta,
  formatEps,
  formatMultiple,
  formatPercent,
} from "@/lib/format";

interface PageProps {
  params: Promise<{ ticker: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { ticker } = await params;
  const t = decodeURIComponent(ticker).toUpperCase();
  return { title: `${t} — AI Equity Research Terminal` };
}

export default async function DashboardPage({ params }: PageProps) {
  const { ticker: raw } = await params;
  const ticker = decodeURIComponent(raw).toUpperCase();

  let data;
  try {
    data = await getCompanyData(ticker);
  } catch (err) {
    return (
      <ErrorState
        ticker={ticker}
        notFound={err instanceof SecNotFoundError}
      />
    );
  }

  const { profile, filings, facts } = data;
  const financials = buildAnnualFinancials(facts);
  const ratios = computeRatios(financials);
  const latest = financials[0];
  const aiEnabled = isAiConfigured();
  const dbEnabled = Boolean(process.env.DATABASE_URL);

  return (
    <div className="space-y-8">
      <ProfileHeader profile={profile} />

      <FreeMemo
        companyName={profile.name}
        ratios={ratios}
        latest={latest}
      />

      {ratios && latest ? (
        <AiMemo ticker={profile.ticker} aiEnabled={aiEnabled} />
      ) : null}

      {ratios && latest ? (
        <section>
          <SectionTitle>Key metrics · FY{ratios.fy}</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <MetricCard
              label="Revenue"
              value={formatCurrency(latest.revenue)}
              hint={
                ratios.revenueGrowth !== undefined
                  ? `${formatDelta(ratios.revenueGrowth)} YoY`
                  : undefined
              }
              tone={signTone(ratios.revenueGrowth)}
            />
            <MetricCard
              label="Net income"
              value={formatCurrency(latest.netIncome)}
              hint={
                ratios.netIncomeGrowth !== undefined
                  ? `${formatDelta(ratios.netIncomeGrowth)} YoY`
                  : undefined
              }
              tone={signTone(latest.netIncome)}
            />
            <MetricCard
              label="Net margin"
              value={formatPercent(ratios.netMargin)}
              tone={thresholdTone(ratios.netMargin, 10, 0)}
            />
            <MetricCard
              label="Gross margin"
              value={formatPercent(ratios.grossMargin)}
            />
            <MetricCard
              label="Operating margin"
              value={formatPercent(ratios.operatingMargin)}
              tone={thresholdTone(ratios.operatingMargin, 10, 0)}
            />
            <MetricCard
              label="Return on equity"
              value={formatPercent(ratios.returnOnEquity)}
              tone={thresholdTone(ratios.returnOnEquity, 15, 0)}
            />
            <MetricCard
              label="Return on assets"
              value={formatPercent(ratios.returnOnAssets)}
            />
            <MetricCard
              label="Diluted EPS"
              value={formatEps(ratios.epsDiluted)}
              tone={signTone(ratios.epsDiluted)}
            />
            <MetricCard
              label="Current ratio"
              value={formatMultiple(ratios.currentRatio)}
              tone={thresholdTone(ratios.currentRatio, 1.5, 1)}
            />
            <MetricCard
              label="Debt / equity"
              value={formatMultiple(ratios.debtToEquity)}
              tone={invertedThresholdTone(ratios.debtToEquity, 0.5, 2)}
            />
            <MetricCard
              label="FCF margin"
              value={formatPercent(ratios.fcfMargin)}
              tone={thresholdTone(ratios.fcfMargin, 10, 0)}
            />
            <MetricCard
              label="Cash & equivalents"
              value={formatCurrency(latest.cash)}
            />
          </div>
        </section>
      ) : null}

      <TrendCharts rows={financials} />

      {financials.length > 0 ? (
        <section>
          <SectionTitle>Financial statements</SectionTitle>
          <FinancialsTable rows={financials} />
        </section>
      ) : null}

      <section>
        <SectionTitle>Recent filings</SectionTitle>
        {filings.length > 0 ? (
          <ul className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800">
            {filings.map((f, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-md border border-slate-700 bg-slate-800/70 px-2 py-0.5 text-xs font-semibold text-sky-300">
                    {f.form}
                  </span>
                  <span className="text-sm text-slate-300">
                    {f.description}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="tabular">Filed {f.filingDate}</span>
                  <a
                    href={f.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sky-400 hover:text-sky-300"
                  >
                    Document ↗
                  </a>
                  <a
                    href={f.filingIndexUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-slate-300"
                  >
                    Index
                  </a>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No recent filings found.</p>
        )}
      </section>

      <FilingsQA
        ticker={profile.ticker}
        aiEnabled={aiEnabled}
        dbEnabled={dbEnabled}
      />

      <p className="text-xs text-slate-600">
        Source: U.S. SEC EDGAR. Figures are as reported in XBRL and may differ
        from adjusted/non-GAAP numbers companies highlight elsewhere.
      </p>
    </div>
  );
}

// ─── Local presentational helpers ────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </h2>
  );
}

function ProfileHeader({
  profile,
}: {
  profile: Awaited<ReturnType<typeof getCompanyData>>["profile"];
}) {
  const facts = [
    profile.exchange && `${profile.exchange}: ${profile.ticker}`,
    profile.sicDescription,
    profile.location,
    profile.fiscalYearEnd && `FY ends ${formatFiscalEnd(profile.fiscalYearEnd)}`,
  ].filter(Boolean);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
            <span className="rounded-md bg-slate-800 px-2 py-0.5 text-sm font-semibold text-slate-300">
              {profile.ticker}
            </span>
          </div>
          <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-sm text-slate-400">
            {facts.map((f, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-slate-700">·</span>}
                {f}
              </span>
            ))}
          </p>
          {profile.website ? (
            <a
              href={normalizeUrl(profile.website)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-medium text-sky-400 hover:text-sky-300"
            >
              {profile.website.replace(/^https?:\/\//, "")} ↗
            </a>
          ) : null}
        </div>
        <div className="text-right text-xs text-slate-500">
          CIK {profile.cik}
        </div>
      </div>
    </section>
  );
}

function FinancialsTable({ rows }: { rows: YearFinancials[] }) {
  // Columns newest-first.
  const lineItems: { label: string; pick: (r: YearFinancials) => string }[] = [
    { label: "Revenue", pick: (r) => formatCurrency(r.revenue) },
    { label: "Gross profit", pick: (r) => formatCurrency(r.grossProfit) },
    { label: "Operating income", pick: (r) => formatCurrency(r.operatingIncome) },
    { label: "Net income", pick: (r) => formatCurrency(r.netIncome) },
    { label: "Diluted EPS", pick: (r) => formatEps(r.epsDiluted) },
    { label: "Total assets", pick: (r) => formatCurrency(r.assets) },
    { label: "Total equity", pick: (r) => formatCurrency(r.equity) },
    {
      label: "Operating cash flow",
      pick: (r) => formatCurrency(r.operatingCashFlow),
    },
    { label: "Free cash flow", pick: (r) => formatCurrency(r.freeCashFlow) },
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="bg-slate-900/70 text-left">
            <th className="px-4 py-3 font-medium text-slate-400">Line item</th>
            {rows.map((r) => (
              <th
                key={r.fy}
                className="px-4 py-3 text-right font-semibold text-slate-200"
              >
                FY{r.fy}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, idx) => (
            <tr
              key={item.label}
              className={idx % 2 ? "bg-slate-900/20" : "bg-transparent"}
            >
              <td className="px-4 py-2.5 text-slate-400">{item.label}</td>
              {rows.map((r) => (
                <td
                  key={r.fy}
                  className="tabular px-4 py-2.5 text-right text-slate-200"
                >
                  {item.pick(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ErrorState({
  ticker,
  notFound,
}: {
  ticker: string;
  notFound: boolean;
}) {
  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <h1 className="text-2xl font-bold text-white">
        {notFound ? `No filer found for “${ticker}”` : "Couldn’t load data"}
      </h1>
      <p className="mt-3 text-sm text-slate-400">
        {notFound
          ? "SEC EDGAR has no company matching that ticker. Check the symbol and try another — only U.S.-listed filers are covered."
          : "Something went wrong fetching SEC data. This is usually transient — try again in a moment."}
      </p>
      <div className="mx-auto mt-6 max-w-md">
        <SearchBox />
      </div>
      <Link
        href="/"
        className="mt-4 inline-block text-sm font-medium text-sky-400 hover:text-sky-300"
      >
        ← Back home
      </Link>
    </div>
  );
}

// ─── tone + formatting utilities local to the dashboard ──────────────────────

function signTone(value?: number): MetricTone {
  if (value === undefined) return "neutral";
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

/** Green at/above `good`, red below `bad`, neutral between. */
function thresholdTone(value: number | undefined, good: number, bad: number): MetricTone {
  if (value === undefined) return "neutral";
  if (value >= good) return "positive";
  if (value < bad) return "negative";
  return "neutral";
}

/** Inverted: lower is better (e.g. leverage). */
function invertedThresholdTone(
  value: number | undefined,
  good: number,
  bad: number
): MetricTone {
  if (value === undefined) return "neutral";
  if (value <= good) return "positive";
  if (value > bad) return "negative";
  return "neutral";
}

function formatFiscalEnd(mmdd: string): string {
  // EDGAR reports fiscalYearEnd as MMDD, e.g. "0930".
  if (!/^\d{4}$/.test(mmdd)) return mmdd;
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const m = Number(mmdd.slice(0, 2));
  const d = Number(mmdd.slice(2, 4));
  if (m < 1 || m > 12) return mmdd;
  return `${months[m - 1]} ${d}`;
}

function normalizeUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}
