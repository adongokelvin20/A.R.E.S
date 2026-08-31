"use client";

import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AresDashboardKpis } from "./dashboard/kpis";
import { AresRevenueChart } from "./dashboard/revenue-chart";
import { AresChannelsChart } from "./dashboard/channels-chart";
import { AresOrderStatusChart } from "./dashboard/order-status-chart";
import { AresAlertsFeed } from "./dashboard/alerts-feed";
import { AresActivityFeed } from "./dashboard/activity-feed";
import { AresAiInsights } from "./dashboard/ai-insights";
import { AresAuditLog } from "./dashboard/audit-log";
import { AresAiChat } from "./dashboard/ai-chat";
import { AresBriefing } from "./dashboard/briefing";
import { AresAutomationEngine } from "./dashboard/automation-engine";
import { AresActionCenter } from "./dashboard/action-center";

const SECTORS = [
  { slug: "accra-threads", label: "Clothing Store", business: "Accra Threads Co." },
  { slug: "bantuma-kitchen", label: "Restaurant", business: "Bantuma Kitchen" },
  { slug: "rising-stars-academy", label: "School", business: "Rising Stars Academy" },
  { slug: "east-legon-estates", label: "Real Estate", business: "East Legon Estates" },
  { slug: "clearflow-plumbing", label: "Service", business: "ClearFlow Plumbing" },
];

export function AresDashboard() {
  const [sectorSlug, setSectorSlug] = useState("accra-threads");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "ai" | "ops" | "audit">("overview");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ares/dashboard?slug=${sectorSlug}&t=${Date.now()}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("dashboard load failed", e);
    } finally {
      setLoading(false);
    }
  }, [sectorSlug]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section id="dashboard" className="relative py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-ares-mist to-white" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-ares-sea/20 bg-ares-foam px-3 py-1 text-xs font-medium text-ares-sea-deep">
            Live command center
          </div>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-ares-navy sm:text-4xl md:text-5xl">
            Your business, at a glance —{" "}
            <span className="ares-text-gradient">running on real data</span>
          </h2>
          <p className="mt-5 text-balance text-base text-muted-foreground sm:text-lg">
            Every chart, KPI, alert, and insight below is computed from a real seeded business
            database. Switch sectors to see A.R.E.S. reconfigure itself for each business type.
          </p>
        </div>

        {/* Sector switcher */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {SECTORS.map((s) => (
            <button
              key={s.slug}
              onClick={() => setSectorSlug(s.slug)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                sectorSlug === s.slug
                  ? "bg-ares-navy text-white shadow-[0_8px_20px_-8px_rgba(11,31,51,0.4)]"
                  : "border border-ares-line bg-white text-ares-navy hover:border-ares-sea/40"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* The dashboard surface */}
        <div className="mt-10 overflow-hidden rounded-3xl border border-ares-line bg-white shadow-[0_30px_80px_-40px_rgba(11,31,51,0.25)]">
          {/* Top bar — like an OS chrome */}
          <div className="flex items-center justify-between border-b border-ares-line bg-ares-mist px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              </div>
              <div className="ml-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">ares://command-center</span>
                <span className="h-3 w-px bg-ares-line" />
                <span className="font-medium text-ares-navy">
                  {loading ? "Loading…" : data?.business?.name ?? "—"}
                </span>
                {!loading && data?.business?.plan && (
                  <span className="rounded-md bg-ares-sea/10 px-1.5 py-0.5 text-[10px] font-semibold text-ares-sea-deep">
                    {data.business.plan}
                  </span>
                )}
              </div>
            </div>
            <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ares-sea opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ares-sea" />
              </span>
              Live · synced just now
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-ares-line bg-white px-3 sm:px-5">
            {[
              { id: "overview", label: "Overview" },
              { id: "ai", label: "Ask A.R.E.S." },
              { id: "ops", label: "Operations" },
              { id: "audit", label: "Audit log" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`relative px-3 py-3 text-xs font-semibold transition-colors sm:text-sm ${
                  tab === t.id ? "text-ares-sea-deep" : "text-muted-foreground hover:text-ares-navy"
                }`}
              >
                {t.label}
                {tab === t.id && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ares-sea" />
                )}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6">
            {loading || !data ? (
              <DashboardSkeleton />
            ) : (
              <>
                {tab === "overview" && (
                  <div className="flex flex-col gap-5">
                    <AresBriefing data={data} />
                    <AresDashboardKpis data={data} />
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                      <div className="lg:col-span-2">
                        <AresRevenueChart data={data} />
                      </div>
                      <AresChannelsChart data={data} />
                    </div>
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                      <AresAiInsights data={data} />
                      <AresAlertsFeed data={data} />
                    </div>
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                      <div className="lg:col-span-2">
                        <AresActivityFeed data={data} />
                      </div>
                      <AresOrderStatusChart data={data} />
                    </div>
                  </div>
                )}
                {tab === "ai" && (
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
                    <div className="lg:col-span-3">
                      <AresAiChat data={data} />
                    </div>
                    <div className="lg:col-span-2">
                      <AresActionCenter data={data} />
                    </div>
                  </div>
                )}
                {tab === "ops" && (
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <AresAutomationEngine data={data} />
                    <AresAlertsFeed data={data} />
                  </div>
                )}
                {tab === "audit" && <AresAuditLog data={data} />}
              </>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          All metrics above are derived from a live seeded database. No hardcoded numbers. No
          fake charts. Switch sectors to see the dashboard reconfigure.
        </p>
      </div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
