"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Two ticker inputs that navigate to /compare?a=…&b=…. */
export default function CompareForm({
  initialA = "",
  initialB = "",
}: {
  initialA?: string;
  initialB?: string;
}) {
  const router = useRouter();
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const A = a.trim().toUpperCase();
    const B = b.trim().toUpperCase();
    if (!A || !B) return;
    router.push(`/compare?a=${encodeURIComponent(A)}&b=${encodeURIComponent(B)}`);
  }

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-center text-base font-semibold uppercase tracking-wide text-slate-100 placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-500 focus:border-sky-500 focus:outline-none";

  return (
    <form onSubmit={submit} className="flex flex-col items-center gap-3 sm:flex-row">
      <input
        value={a}
        onChange={(e) => setA(e.target.value)}
        placeholder="First ticker"
        aria-label="First ticker"
        autoComplete="off"
        spellCheck={false}
        className={inputClass}
      />
      <span className="shrink-0 text-sm font-medium text-slate-500">vs</span>
      <input
        value={b}
        onChange={(e) => setB(e.target.value)}
        placeholder="Second ticker"
        aria-label="Second ticker"
        autoComplete="off"
        spellCheck={false}
        className={inputClass}
      />
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400"
      >
        Compare
      </button>
    </form>
  );
}
