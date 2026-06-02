/**
 * A single key-metric tile for the dashboard grid. Purely presentational: the
 * caller formats the value and picks an optional tone for the accent color.
 */

export type MetricTone = "neutral" | "positive" | "negative";

const toneClasses: Record<MetricTone, string> = {
  neutral: "text-slate-100",
  positive: "text-emerald-400",
  negative: "text-red-400",
};

export default function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: MetricTone;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-colors hover:border-slate-700">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={`tabular mt-2 text-2xl font-semibold ${toneClasses[tone]}`}>
        {value}
      </div>
      {hint ? (
        <div className="tabular mt-1 text-xs text-slate-500">{hint}</div>
      ) : null}
    </div>
  );
}
