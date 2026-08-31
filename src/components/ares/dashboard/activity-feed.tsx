"use client";

import { Bot, User, Cog, ArrowRight } from "lucide-react";

const ACTOR_ICON: Record<string, any> = {
  AI: Bot,
  USER: User,
  SYSTEM: Cog,
};

const RESULT_COLOR: Record<string, string> = {
  SUCCESS: "text-emerald-600 bg-emerald-50 border-emerald-200",
  FAILURE: "text-rose-600 bg-rose-50 border-rose-200",
  PENDING_APPROVAL: "text-amber-600 bg-amber-50 border-amber-200",
};

const RISK_COLOR: Record<string, string> = {
  LOW: "bg-emerald-100 text-emerald-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-rose-100 text-rose-700",
};

function timeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export function AresActivityFeed({ data }: { data: any }) {
  const activity = data.activity ?? [];

  return (
    <div className="overflow-hidden rounded-2xl border border-ares-line bg-white">
      <div className="flex items-center justify-between border-b border-ares-line p-5">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Recent activity
          </div>
          <div className="mt-1 text-sm font-semibold text-ares-navy">
            AI + human + system, audit-logged
          </div>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto ares-scroll p-3">
        <ol className="space-y-1">
          {activity.map((a: any, i: number) => {
            const Icon = ACTOR_ICON[a.actorType] ?? Cog;
            return (
              <li key={a.id} className="relative flex gap-3 rounded-xl p-2.5 transition-colors hover:bg-ares-mist">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      a.actorType === "AI"
                        ? "bg-ares-sea-deep text-white"
                        : a.actorType === "USER"
                          ? "bg-ares-navy text-white"
                          : "bg-ares-foam text-ares-sea-deep"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {i < activity.length - 1 && (
                    <div className="my-1 w-px flex-1 bg-ares-line" />
                  )}
                </div>
                <div className="min-w-0 flex-1 pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ares-navy">
                      {a.actorName}
                    </span>
                    <span className="text-xs text-muted-foreground">→</span>
                    <span className="font-mono text-xs text-ares-sea-deep">
                      {a.action.replace(/_/g, " ").toLowerCase()}
                    </span>
                    {a.tool && (
                      <span className="rounded bg-ares-mist px-1.5 py-0.5 text-[10px] font-medium text-ares-navy">
                        {a.tool}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px]">
                    <span className={`rounded-md border px-1.5 py-0.5 font-medium ${RESULT_COLOR[a.result] ?? ""}`}>
                      {a.result.replace(/_/g, " ")}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 font-medium ${RISK_COLOR[a.riskLevel] ?? ""}`}>
                      {a.riskLevel} risk
                    </span>
                    <span className="text-muted-foreground">{timeAgo(a.createdAt)}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
