"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

/**
 * On-demand AI narrative memo. Kept on-demand (button-triggered) so the
 * dashboard stays fast and free-tier friendly — the rule-based FreeMemo is
 * always shown; this adds an LLM take when the user asks for it.
 */
export default function AiMemo({
  ticker,
  aiEnabled,
}: {
  ticker: string;
  aiEnabled: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [memo, setMemo] = useState<string | null>(null);
  const [grounded, setGrounded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate memo.");
      setMemo(data.memo);
      setGrounded(Boolean(data.grounded));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate memo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-100">
          AI Investment Memo
        </h2>
        <span className="rounded-full border border-sky-800 bg-sky-950/50 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-sky-300">
          AI-generated
        </span>
      </div>

      {!aiEnabled ? (
        <p className="mt-3 text-sm text-slate-400">
          Add an <code className="text-slate-300">AI_API_KEY</code> to{" "}
          <code className="text-slate-300">.env.local</code> (free Gemini key)
          to enable the AI memo.
        </p>
      ) : memo ? (
        <>
          <div className="prose-memo mt-4 text-sm leading-relaxed text-slate-300">
            <ReactMarkdown>{memo}</ReactMarkdown>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={generate}
              disabled={loading}
              className="text-xs font-medium text-sky-400 hover:text-sky-300 disabled:opacity-50"
            >
              {loading ? "Regenerating…" : "Regenerate"}
            </button>
            <span className="text-xs text-slate-600">
              {grounded
                ? "Grounded in indexed filings"
                : "From financials only — index filings for citations"}
            </span>
          </div>
        </>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-slate-400">
            Generate a balanced bull/bear memo from the financials (and indexed
            filings, if available).
          </p>
          <button
            onClick={generate}
            disabled={loading}
            className="mt-3 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-60"
          >
            {loading ? "Generating…" : "Generate AI memo"}
          </button>
        </div>
      )}

      {error ? (
        <p className="mt-3 rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </section>
  );
}
