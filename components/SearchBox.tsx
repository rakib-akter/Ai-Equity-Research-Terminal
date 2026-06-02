"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Ticker search input. On submit it routes to /dashboard/[ticker]; all the
 * heavy SEC fetching happens server-side on that page.
 */
export default function SearchBox({
  autoFocus = false,
}: {
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ticker = value.trim().toUpperCase();
    if (!ticker) return;
    router.push(`/dashboard/${encodeURIComponent(ticker)}`);
  }

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 shadow-lg shadow-black/30 transition-colors focus-within:border-sky-500">
        <svg
          className="h-5 w-5 shrink-0 text-slate-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search a ticker — AAPL, MSFT, NVDA…"
          aria-label="Stock ticker"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-transparent text-base uppercase tracking-wide text-slate-100 placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-sky-500 px-4 py-1.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400"
        >
          Analyze
        </button>
      </div>
    </form>
  );
}
