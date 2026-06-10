/**
 * Five-year trend charts, rendered as static SVG (server component — no client
 * JS, no charting dependency). Two panels:
 *   1. Revenue — vertical bars with value labels.
 *   2. Margins — gross / operating / net margin trend lines.
 *
 * Values are always labelled, so there's no need for hover tooltips.
 */

import type { YearFinancials } from "@/lib/financials";
import { formatCurrency } from "@/lib/format";

const COLORS = {
  revenue: "#38bdf8", // sky-400
  gross: "#38bdf8", // sky-400
  operating: "#a78bfa", // violet-400
  net: "#34d399", // emerald-400
  grid: "#1e293b", // slate-800
  axis: "#475569", // slate-600
  label: "#94a3b8", // slate-400
};

interface MarginPoint {
  fy: number;
  gross?: number;
  operating?: number;
  net?: number;
}

function pct(part?: number, whole?: number): number | undefined {
  if (part === undefined || whole === undefined || whole === 0) return undefined;
  return (part / whole) * 100;
}

export default function TrendCharts({ rows }: { rows: YearFinancials[] }) {
  // Oldest → newest, left to right.
  const data = [...rows].reverse();
  const withRevenue = data.filter((r) => r.revenue !== undefined);
  if (withRevenue.length < 2) return null;

  const margins: MarginPoint[] = data.map((r) => ({
    fy: r.fy,
    gross: pct(r.grossProfit, r.revenue),
    operating: pct(r.operatingIncome, r.revenue),
    net: pct(r.netIncome, r.revenue),
  }));

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
        Five-year trends
      </h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h3 className="mb-2 text-sm font-medium text-slate-300">Revenue</h3>
          <RevenueBars data={data} />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h3 className="mb-2 text-sm font-medium text-slate-300">
            Margins
          </h3>
          <MarginLines points={margins} />
        </div>
      </div>
    </section>
  );
}

// ─── Revenue bar chart ───────────────────────────────────────────────────────

function RevenueBars({ data }: { data: YearFinancials[] }) {
  const W = 520;
  const H = 260;
  const padX = 18;
  const padTop = 30;
  const padBottom = 28;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;

  const n = data.length;
  const slot = innerW / n;
  const barW = Math.min(slot * 0.5, 64);
  const maxRev = Math.max(...data.map((r) => r.revenue ?? 0), 1);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Revenue by fiscal year"
    >
      {/* baseline */}
      <line
        x1={padX}
        y1={padTop + innerH}
        x2={W - padX}
        y2={padTop + innerH}
        stroke={COLORS.axis}
        strokeWidth="1"
      />
      {data.map((r, i) => {
        const value = r.revenue ?? 0;
        const h = (value / maxRev) * innerH;
        const x = padX + slot * i + (slot - barW) / 2;
        const y = padTop + (innerH - h);
        return (
          <g key={r.fy}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx="3"
              fill={COLORS.revenue}
              fillOpacity="0.85"
            />
            <text
              x={x + barW / 2}
              y={y - 7}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="#e2e8f0"
            >
              {formatCurrency(r.revenue)}
            </text>
            <text
              x={x + barW / 2}
              y={H - 9}
              textAnchor="middle"
              fontSize="11"
              fill={COLORS.label}
            >
              FY{r.fy}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Margin line chart ───────────────────────────────────────────────────────

function MarginLines({ points }: { points: MarginPoint[] }) {
  const W = 520;
  const H = 260;
  const padX = 36;
  const padTop = 16;
  const padBottom = 28;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;

  const n = points.length;
  const all = points.flatMap((p) =>
    [p.gross, p.operating, p.net].filter((v): v is number => v !== undefined)
  );
  if (all.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        Margin data not reported.
      </p>
    );
  }

  let vmax = Math.max(...all, 0);
  let vmin = Math.min(...all, 0);
  const pad = (vmax - vmin) * 0.12 || 5;
  vmax += pad;
  vmin -= pad;

  const x = (i: number) => padX + (n === 1 ? innerW / 2 : (innerW / (n - 1)) * i);
  const y = (v: number) =>
    padTop + innerH * (1 - (v - vmin) / (vmax - vmin));

  const series: { key: keyof MarginPoint; color: string; label: string }[] = [
    { key: "gross", color: COLORS.gross, label: "Gross" },
    { key: "operating", color: COLORS.operating, label: "Operating" },
    { key: "net", color: COLORS.net, label: "Net" },
  ];

  // Gridlines at 0 and the rounded max.
  const zeroY = vmin < 0 && vmax > 0 ? y(0) : null;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Margin trends by fiscal year"
      >
        {/* horizontal gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const gy = padTop + innerH * t;
          const val = vmax - t * (vmax - vmin);
          return (
            <g key={t}>
              <line
                x1={padX}
                y1={gy}
                x2={W - padX}
                y2={gy}
                stroke={COLORS.grid}
                strokeWidth="1"
              />
              <text
                x={padX - 6}
                y={gy + 3}
                textAnchor="end"
                fontSize="10"
                fill={COLORS.label}
              >
                {Math.round(val)}%
              </text>
            </g>
          );
        })}
        {zeroY !== null ? (
          <line
            x1={padX}
            y1={zeroY}
            x2={W - padX}
            y2={zeroY}
            stroke={COLORS.axis}
            strokeWidth="1"
          />
        ) : null}

        {/* x-axis year labels */}
        {points.map((p, i) => (
          <text
            key={p.fy}
            x={x(i)}
            y={H - 9}
            textAnchor="middle"
            fontSize="11"
            fill={COLORS.label}
          >
            FY{p.fy}
          </text>
        ))}

        {/* one polyline + dots per series */}
        {series.map((s) => {
          const pts = points
            .map((p, i) => {
              const v = p[s.key] as number | undefined;
              return v === undefined ? null : { x: x(i), y: y(v) };
            })
            .filter((p): p is { x: number; y: number } => p !== null);
          if (pts.length === 0) return null;
          const path = pts.map((p) => `${p.x},${p.y}`).join(" ");
          return (
            <g key={s.key}>
              <polyline
                points={path}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3" fill={s.color} />
              ))}
            </g>
          );
        })}
      </svg>

      {/* legend */}
      <div className="mt-2 flex flex-wrap justify-center gap-4">
        {series.map((s) => (
          <span
            key={s.key}
            className="flex items-center gap-1.5 text-xs text-slate-400"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.label} margin
          </span>
        ))}
      </div>
    </div>
  );
}
