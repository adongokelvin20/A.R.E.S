"use client";

import { Workflow, Play, Pause, Zap } from "lucide-react";

export function AresAutomationEngine({ data }: { data: any }) {
  const automations = data.automations ?? [];

  return (
    <div className="overflow-hidden rounded-2xl border border-ares-line bg-white">
      <div className="flex items-center justify-between border-b border-ares-line p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ares-foam text-ares-sea-deep">
            <Workflow className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Automation engine
            </div>
            <div className="text-sm font-semibold text-ares-navy">
              {automations.length} active workflows
            </div>
          </div>
        </div>
        <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
          {automations.reduce((s: number, a: any) => s + (a.runCount ?? 0), 0)} runs
        </span>
      </div>
      <div className="max-h-96 overflow-y-auto ares-scroll p-3">
        <ul className="space-y-2">
          {automations.map((a: any) => {
            const actions: string[] = typeof a.actions === "string" ? JSON.parse(a.actions) : a.actions;
            const isActive = a.status === "ACTIVE";
            return (
              <li
                key={a.id}
                className="rounded-xl border border-ares-line bg-white p-3.5 transition-all hover:border-ares-sea/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-ares-sea-deep" />
                      <span className="text-sm font-semibold text-ares-navy">{a.name}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                  </div>
                  <button
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      isActive
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-ares-mist text-muted-foreground"
                    }`}
                    aria-label={isActive ? "Pause" : "Activate"}
                  >
                    {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="rounded bg-ares-mist px-1.5 py-0.5 text-[10px] font-medium text-ares-navy">
                    WHEN · {a.trigger.replace(/_/g, " ").toLowerCase()}
                  </span>
                  {actions.map((act) => (
                    <span
                      key={act}
                      className="rounded bg-ares-foam px-1.5 py-0.5 text-[10px] font-medium text-ares-sea-deep"
                    >
                      THEN · {act.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">
                  {a.runCount} runs · last fired recently
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
