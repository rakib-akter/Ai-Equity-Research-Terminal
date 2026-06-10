/**
 * Renders the saved-companies watchlist on the landing page. Best-effort: if
 * the database isn't configured/reachable, or the list is empty, it renders
 * nothing so the landing page stays clean.
 */

import Link from "next/link";
import { listWatchlist } from "@/lib/watchlist";

export default async function Watchlist() {
  let items: Awaited<ReturnType<typeof listWatchlist>> = [];
  try {
    items = await listWatchlist();
  } catch {
    return null; // DB not configured / unreachable
  }
  if (items.length === 0) return null;

  return (
    <section className="mx-auto mt-12 max-w-4xl">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 text-amber-400"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 17.3 6.2 20.5l1.1-6.5L2.6 9.4l6.5-.9L12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5z" />
        </svg>
        Your watchlist
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.ticker}
            href={`/dashboard/${item.ticker}`}
            className="group rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-colors hover:border-sky-600"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-100">
                {item.ticker}
              </span>
              {item.exchange ? (
                <span className="text-xs text-slate-500">{item.exchange}</span>
              ) : null}
            </div>
            <div className="mt-1 truncate text-sm text-slate-400 group-hover:text-slate-300">
              {item.name}
            </div>
            {item.sector ? (
              <div className="mt-1 truncate text-xs text-slate-600">
                {item.sector}
              </div>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
