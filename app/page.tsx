import SearchBox from "@/components/SearchBox";
import Watchlist from "@/components/Watchlist";

const EXAMPLES = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "JPM"];

const FEATURES = [
  {
    title: "Company profile",
    body: "Business description, exchange, sector and location straight from EDGAR.",
  },
  {
    title: "Financial statements",
    body: "Five years of income, balance-sheet and cash-flow figures from XBRL.",
  },
  {
    title: "Key ratios",
    body: "Margins, returns, liquidity and leverage computed on the fly.",
  },
  {
    title: "Filing summaries",
    body: "The latest 10-K, 10-Q and 8-K filings, linked to their source.",
  },
  {
    title: "Investment memo",
    body: "A transparent, rule-based read on strengths and watch-items.",
  },
  {
    title: "Source-backed",
    body: "Every figure traces to a public SEC filing — no black boxes.",
  },
];

export default function Home() {
  return (
    <div className="py-6">
      <section className="mx-auto max-w-2xl text-center">
        <span className="inline-block rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs font-medium text-slate-400">
          Free · Powered by SEC EDGAR
        </span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Research any public company
          <br />
          in seconds.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-slate-400">
          Search a ticker to get a clean financial dashboard, key ratios, recent
          filings, and a rule-based investment memo — all sourced from official
          SEC data.
        </p>

        <div className="mx-auto mt-8 max-w-xl">
          <SearchBox autoFocus />
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-500">
            <span>Try:</span>
            {EXAMPLES.map((t) => (
              <a
                key={t}
                href={`/dashboard/${t}`}
                className="rounded-md border border-slate-800 px-2 py-0.5 font-medium text-slate-300 transition-colors hover:border-sky-600 hover:text-sky-400"
              >
                {t}
              </a>
            ))}
          </div>
        </div>
      </section>

      <Watchlist />

      <section className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-slate-800 bg-slate-900/40 p-5"
          >
            <h3 className="text-sm font-semibold text-slate-100">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
              {f.body}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
