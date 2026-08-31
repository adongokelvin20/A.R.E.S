"use client";

import { AlertTriangle, Bell, Info } from "lucide-react";

const SEVERITY: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  URGENT: { icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50 border-rose-200", label: "Urgent" },
  ATTENTION: { icon: Bell, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "Attention" },
  INFO: { icon: Info, color: "text-ares-sea-deep", bg: "bg-ares-foam border-ares-sea/20", label: "Info" },
};

export function AresAlertsFeed({ data }: { data: any }) {
  const alerts = data.alerts ?? [];

  return (
    <div className="overflow-hidden rounded-2xl border border-ares-line bg-white">
      <div className="flex items-center justify-between border-b border-ares-line p-5">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Live alerts
          </div>
          <div className="mt-1 text-sm font-semibold text-ares-navy">
            {alerts.length} need attention
          </div>
        </div>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
        </span>
      </div>
      <div className="max-h-80 overflow-y-auto ares-scroll p-3">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No open alerts. A.R.E.S. is monitoring.
          </div>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a: any) => {
              const sev = SEVERITY[a.severity] ?? SEVERITY.ATTENTION;
              return (
                <li
                  key={a.id}
                  className={`rounded-xl border ${sev.bg} p-3 transition-all hover:shadow-sm`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${sev.color}`}>
                      <sev.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${sev.color}`}>
                          {sev.label} · {a.source}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{a.type.replace(/_/g, " ")}</span>
                      </div>
                      <div className="mt-0.5 text-sm font-semibold text-ares-navy">
                        {a.title}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{a.message}</div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
