"use client";

import { useId } from "react";

/**
 * Lightweight SVG line+area chart — no external chart lib needed.
 * Designed for premium aesthetic with sea-blue gradient.
 */
export function AresRevenueChart({ data }: { data: any }) {
  const series: { date: string; revenue: number; orders: number }[] = data.series;
  const currency = data.business.currency;
  const gradientId = useId();

  const maxRevenue = Math.max(...series.map((s) => s.revenue), 1);
  const width = 760;
  const height = 220;
  const padding = { top: 20, right: 16, bottom: 28, left: 48 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const points = series.map((s, i) => {
    const x = padding.left + (i / Math.max(series.length - 1, 1)) * innerW;
    const y = padding.top + innerH - (s.revenue / maxRevenue) * innerH;
    return { x, y, ...s };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
  const areaPath =
    `M ${points[0].x.toFixed(2)} ${padding.top + innerH} ` +
    points.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ") +
    ` L ${points[points.length - 1].x.toFixed(2)} ${padding.top + innerH} Z`;

  const total = series.reduce((s, p) => s + p.revenue, 0);
  const totalOrders = series.reduce((s, p) => s + p.orders, 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-ares-line bg-white">
      <div className="flex items-start justify-between border-b border-ares-line p-5">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Revenue · last 14 days
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-ares-navy">
            {currency === "GHS" ? "GH₵" : currency} {total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {totalOrders} orders across {data.channelBreakdown.length} channels
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-ares-foam px-2 py-1 font-medium text-ares-sea-deep">
            <span className="h-2 w-2 rounded-full bg-ares-sea" />
            Revenue
          </span>
        </div>
      </div>
      <div className="p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0EA5C7" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#0EA5C7" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = padding.top + t * innerH;
            return (
              <line
                key={t}
                x1={padding.left}
                y1={y}
                x2={padding.left + innerW}
                y2={y}
                stroke="#E6EEF5"
                strokeDasharray="3 3"
              />
            );
          })}
          {/* Y labels */}
          {[0, 0.5, 1].map((t) => {
            const y = padding.top + (1 - t) * innerH;
            const val = Math.round(t * maxRevenue);
            return (
              <text
                key={t}
                x={padding.left - 8}
                y={y + 3}
                fontSize="9"
                fill="#5B6B7E"
                textAnchor="end"
                fontFamily="monospace"
              >
                {val}
              </text>
            );
          })}
          {/* Area */}
          <path d={areaPath} fill={`url(#${gradientId})`} />
          {/* Line */}
          <path d={linePath} fill="none" stroke="#0369A1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {/* Points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="3" fill="#0EA5C7" stroke="white" strokeWidth="1.5" />
            </g>
          ))}
          {/* X labels (every other) */}
          {points.map((p, i) =>
            i % 2 === 0 ? (
              <text
                key={i}
                x={p.x}
                y={height - 8}
                fontSize="9"
                fill="#5B6B7E"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {p.date}
              </text>
            ) : null
          )}
        </svg>
      </div>
    </div>
  );
}
