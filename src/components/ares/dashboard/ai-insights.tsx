"use client";

import { Sparkles, Zap, AlertTriangle, Info, ArrowRight, Brain } from "lucide-react";

const SEV = {
  URGENT: { icon: AlertTriangle, color: "text-rose-600", chip: "bg-rose-50 text-rose-700 border-rose-200" },
  ATTENTION: { icon: Zap, color: "text-amber-600", chip: "bg-amber-50 text-amber-700 border-amber-200" },
  INFO: { icon: Info, color: "text-ares-sea-deep", chip: "bg-ares-foam text-ares-sea-deep border-ares-sea/20" },
};

export function AresAiInsights({ data }: { data: any }) {
  const insights = data.insights ?? [];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-ares-line bg-gradient-to-br from-white via-ares-mist to-white">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-ares-sea via-ares-sea-deep to-ares-navy" />
      <div className="flex items-center justify-between border-b border-ares-line p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ares-sea-deep text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              A.R.E.S. AI insights
            </div>
            <div className="text-sm font-semibold text-ares-navy">
              {insights.length} findings from monitoring
            </div>
          </div>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto ares-scroll p-3">
        {insights.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No active insights. A.R.E.S. is monitoring business activity.
          </div>
        ) : (
          <ul className="space-y-2">
            {insights.map((ins: any) => {
              const sev = SEV[ins.severity as keyof typeof SEV] ?? SEV.INFO;
              const actions: string[] = JSON.parse(ins.suggestedActions);
              return (
                <li
                  key={ins.id}
                  className="rounded-xl border border-ares-line bg-white p-3.5 transition-all hover:border-ares-sea/30 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <sev.icon className={`h-4 w-4 ${sev.color}`} />
                      <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${sev.chip}`}>
                        {ins.severity}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {ins.category}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-ares-navy">
                    {ins.title}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {ins.body}
                  </p>
                  {actions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {actions.map((a) => (
                        <button
                          key={a}
                          className="inline-flex items-center gap-1 rounded-lg bg-ares-mist px-2 py-1 text-[11px] font-medium text-ares-sea-deep transition-colors hover:bg-ares-foam"
                        >
                          {a.replace(/_/g, " ")}
                          <ArrowRight className="h-2.5 w-2.5" />
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
