"use client";

import { TrendingUp, TrendingDown, ArrowRight, Users, ShoppingBag, Clock, Package, AlertTriangle } from "lucide-react";

interface KpiData {
  todayRevenue: number;
  yesterdayRevenue: number;
  revenueDeltaPct: number;
  todayOrderCount: number;
  pendingOrders: number;
  customerCount: number;
  newCustomersToday: number;
  avgResponseSec: number;
  totalProducts: number;
  lowStockCount: number;
}

function formatCurrency(value: number, currency: string) {
  const symbol = currency === "GHS" ? "GH₵" : currency === "USD" ? "$" : currency === "NGN" ? "₦" : currency === "KES" ? "KSh" : currency === "ZAR" ? "R" : currency === "GBP" ? "£" : currency;
  return `${symbol}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatSeconds(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export function AresDashboardKpis({ data }: { data: any }) {
  const k: KpiData = data.kpis;
  const currency = data.business.currency;
  const up = k.revenueDeltaPct >= 0;

  const cards = [
    {
      label: "Revenue today",
      value: formatCurrency(k.todayRevenue, currency),
      delta: `${up ? "+" : ""}${k.revenueDeltaPct}%`,
      deltaLabel: "vs. yesterday",
      trend: up ? "up" : "down",
      icon: TrendingUp,
      accent: true,
    },
    {
      label: "Orders today",
      value: k.todayOrderCount.toString(),
      delta: `${k.pendingOrders} pending`,
      deltaLabel: "needs attention",
      trend: k.pendingOrders > 0 ? "down" : "up",
      icon: ShoppingBag,
    },
    {
      label: "Customers",
      value: k.customerCount.toString(),
      delta: `+${k.newCustomersToday} this period`,
      deltaLabel: "across all channels",
      trend: "up",
      icon: Users,
    },
    {
      label: "AI response time",
      value: formatSeconds(k.avgResponseSec),
      delta: "within SLA",
      deltaLabel: "target < 2 min",
      trend: "up",
      icon: Clock,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`relative overflow-hidden rounded-2xl border p-4 ${
            c.accent
              ? "border-ares-sea/30 bg-gradient-to-br from-ares-foam to-white"
              : "border-ares-line bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {c.label}
            </span>
            <c.icon className={`h-4 w-4 ${c.accent ? "text-ares-sea-deep" : "text-muted-foreground"}`} />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-ares-navy sm:text-3xl">
            {c.value}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px]">
            {c.trend === "up" ? (
              <TrendingUp className="h-3 w-3 text-emerald-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-rose-600" />
            )}
            <span
              className={`font-semibold ${
                c.trend === "up" ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {c.delta}
            </span>
            <span className="text-muted-foreground">{c.deltaLabel}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
