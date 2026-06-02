"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

interface QaSource {
  ref: number;
  form: string;
  filingDate: string;
  url: string;
  snippet: string;
}

/**
 * Source-backed Q&A over a company's filings. The user first indexes the
 * filings (download → chunk → embed → store), then asks questions answered
 * from retrieved excerpts with citations.
 */
export default function FilingsQA({
  ticker,
  aiEnabled,
  dbEnabled,
}: {
  ticker: string;
  aiEnabled: boolean;
  dbEnabled: boolean;
}) {
  const [indexing, setIndexing] = useState(false);
  const [indexMsg, setIndexMsg] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<QaSource[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function indexFilings() {
    setIndexing(true);
    setError(null);
    setIndexMsg(null);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Indexing failed.");
      setIndexMsg(
        `Indexed ${data.filingsIndexed} filing(s), ${data.chunksIndexed} chunks. You can ask questions now.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Indexing failed.");
    } finally {
      setIndexing(false);
    }
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setAsking(true);
    setError(null);
    setAnswer(null);
    setSources([]);
    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Q&A failed.");
      setAnswer(data.answer);
      setSources(data.sources ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Q&A failed.");
    } finally {
      setAsking(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-100">Ask the filings</h2>
        <span className="rounded-full border border-sky-800 bg-sky-950/50 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-sky-300">
          Source-backed
        </span>
      </div>

      {!aiEnabled || !dbEnabled ? (
        <p className="mt-3 text-sm text-slate-400">
          Q&amp;A needs both an{" "}
          <code className="text-slate-300">AI_API_KEY</code> and a database (
          <code className="text-slate-300">DATABASE_URL</code> /{" "}
          <code className="text-slate-300">DIRECT_URL</code>) in{" "}
          <code className="text-slate-300">.env.local</code>.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={indexFilings}
              disabled={indexing}
              className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 disabled:opacity-60"
            >
              {indexing ? "Indexing filings…" : "Index latest filings"}
            </button>
            {indexMsg ? (
              <span className="text-xs text-emerald-400">{indexMsg}</span>
            ) : (
              <span className="text-xs text-slate-500">
                Run once per company (10-K + 10-Q).
              </span>
            )}
          </div>

          <form onSubmit={ask} className="mt-4">
            <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 focus-within:border-sky-500">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. What are the main risk factors? How does revenue break down?"
                className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={asking}
                className="shrink-0 rounded-lg bg-sky-500 px-3 py-1 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-60"
              >
                {asking ? "…" : "Ask"}
              </button>
            </div>
          </form>

          {answer ? (
            <div className="mt-4">
              <div className="prose-memo text-sm leading-relaxed text-slate-300">
                <ReactMarkdown>{answer}</ReactMarkdown>
              </div>
              {sources.length > 0 ? (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Sources
                  </h3>
                  <ol className="mt-2 space-y-2">
                    {sources.map((s) => (
                      <li key={s.ref} className="text-xs text-slate-400">
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-sky-400 hover:text-sky-300"
                        >
                          [{s.ref}] {s.form} · filed {s.filingDate} ↗
                        </a>
                        <span className="ml-1 text-slate-500">{s.snippet}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      {error ? (
        <p className="mt-3 rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </section>
  );
}
