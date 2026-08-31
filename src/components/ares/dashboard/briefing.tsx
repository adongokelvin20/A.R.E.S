"use client";

import { Sparkles } from "lucide-react";

export function AresBriefing({ data }: { data: any }) {
  const k = data.kpis;
  const currency = data.business.currency;
  const symbol = currency === "GHS" ? "GH₵" : currency === "USD" ? "$" : currency;
  const businessName = data.business.name;

  // Build a command center daily briefing from real data
  const lowStockItems = data.lowStock ?? [];
  const openAlerts = data.alerts ?? [];
  const urgentAlerts = openAlerts.filter((a: any) => a.severity === "URGENT");

  const segments: string[] = [];
  segments.push(`Good day. I'm A.R.E.S., your AI employee for ${businessName}.`);
  segments.push(
    `You've taken in ${symbol}${k.todayRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} today across ${k.todayOrderCount} orders — ${k.revenueDeltaPct >= 0 ? "up" : "down"} ${Math.abs(k.revenueDeltaPct)}% versus yesterday.`
  );
  if (k.pendingOrders > 0) {
    segments.push(`${k.pendingOrders} order${k.pendingOrders === 1 ? "" : "s"} still need your attention.`);
  }
  if (lowStockItems.length > 0) {
    segments.push(
      `${lowStockItems.length} product${lowStockItems.length === 1 ? "" : "s"} dropped below their restock threshold — ${lowStockItems.slice(0, 2).map((p: any) => p.name).join(", ")}${lowStockItems.length > 2 ? ", and more." : "."}`
    );
  }
  if (urgentAlerts.length > 0) {
    segments.push(`${urgentAlerts.length} urgent alert${urgentAlerts.length === 1 ? "" : "s"} require action.`);
  }
  segments.push(`I've drafted suggested actions below. Want me to handle any of them?`);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-ares-sea/20 bg-gradient-to-br from-ares-navy via-ares-sea-deep to-ares-sea-deep p-5 text-white sm:p-6">
      {/* Decorative glow */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-ares-sea/30 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-ares-sea/20 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <Sparkles className="h-5 w-5" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ares-navy bg-emerald-400" />
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-white/70">
              A.R.E.S. daily briefing
            </div>
            <div className="text-sm font-semibold">Generated just now · from live data</div>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm leading-relaxed text-white/90">
          {segments.map((s, i) => (
            <p key={i} className="ares-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              {s}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
