"use client";

import { useState, useEffect } from "react";
import { Calendar, TrendingUp, Users, Package, Loader2 } from "lucide-react";

interface Archive {
  id: string;
  weekStart: string;
  weekEnd: string;
  revenue: number;
  orderCount: number;
  customerCount: number;
  newCustomers: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  channelBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  summary: string;
}

export function AresArchives() {
  const [archives, setArchives] = useState<Archive[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/weekly-archives")
      .then((r) => r.json())
      .then((data) => {
        setArchives(data.archives ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-ares-sea-deep" />
      </div>
    );
  }

  if (archives.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-ares-navy">Weekly Archives</h2>
          <p className="text-xs text-muted-foreground">Your weekly performance history</p>
        </div>
        <div className="rounded-2xl border border-dashed border-ares-line bg-white p-10 text-center">
          <Calendar className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-semibold text-ares-navy">No archives yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Weekly archives are created automatically at the start of each week. Check back after your first week.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ares-navy">Weekly Archives</h2>
        <p className="text-xs text-muted-foreground">{archives.length} week{archives.length === 1 ? "" : "s"} of history</p>
      </div>

      <div className="space-y-3">
        {archives.map((a) => {
          const weekStart = new Date(a.weekStart);
          const weekEnd = new Date(a.weekEnd);
          return (
            <div key={a.id} className="rounded-2xl border border-ares-line bg-white p-5">
              {/* Week header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-ares-navy">
                    {weekStart.toLocaleDateString("en", { month: "short", day: "numeric" })} — {weekEnd.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{a.summary}</div>
                </div>
              </div>

              {/* KPIs */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-ares-mist p-3">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-ares-sea-deep" />
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Revenue</span>
                  </div>
                  <div className="mt-1 font-mono text-lg font-bold text-ares-navy">GHC {a.revenue.toFixed(0)}</div>
                </div>
                <div className="rounded-lg bg-ares-mist p-3">
                  <div className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-ares-sea-deep" />
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Orders</span>
                  </div>
                  <div className="mt-1 font-mono text-lg font-bold text-ares-navy">{a.orderCount}</div>
                </div>
                <div className="rounded-lg bg-ares-mist p-3">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-ares-sea-deep" />
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">New customers</span>
                  </div>
                  <div className="mt-1 font-mono text-lg font-bold text-ares-navy">{a.newCustomers}</div>
                </div>
              </div>

              {/* Top products */}
              {a.topProducts.length > 0 && (
                <div className="mt-4">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Top products</div>
                  <div className="mt-2 space-y-1.5">
                    {a.topProducts.slice(0, 5).map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-ares-navy">{p.name}</span>
                        <span className="text-muted-foreground">{p.quantity} sold · GHC {p.revenue.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Channel breakdown */}
              {Object.keys(a.channelBreakdown).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(a.channelBreakdown).map(([ch, count]) => (
                    <span key={ch} className="rounded-full bg-ares-foam px-2 py-0.5 text-[10px] font-medium text-ares-sea-deep">
                      {ch}: {count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
