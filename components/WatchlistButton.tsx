"use client";

import { useState } from "react";

/**
 * Star toggle that adds/removes the current company from the shared watchlist.
 * Initial saved state is resolved on the server and passed in to avoid a flash.
 */
export default function WatchlistButton({
  ticker,
  name,
  exchange,
  sector,
  initialSaved,
  dbEnabled,
}: {
  ticker: string;
  name: string;
  exchange?: string | null;
  sector?: string | null;
  initialSaved: boolean;
  dbEnabled: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!dbEnabled) return null;

  async function toggle() {
    setBusy(true);
    setError(null);
    const next = !saved;
    try {
      const res = next
        ? await fetch("/api/watchlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticker, name, exchange, sector }),
          })
        : await fetch(`/api/watchlist?ticker=${encodeURIComponent(ticker)}`, {
            method: "DELETE",
          });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update watchlist.");
      }
      setSaved(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update watchlist.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={toggle}
        disabled={busy}
        aria-pressed={saved}
        title={saved ? "Remove from watchlist" : "Add to watchlist"}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
          saved
            ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
            : "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-600"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 17.3 6.2 20.5l1.1-6.5L2.6 9.4l6.5-.9L12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5z" />
        </svg>
        {saved ? "Watching" : "Watch"}
      </button>
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </div>
  );
}
