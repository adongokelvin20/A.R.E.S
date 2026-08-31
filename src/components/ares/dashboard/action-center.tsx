"use client";

import { CheckCircle2, AlertTriangle, Bell, X, Sparkles } from "lucide-react";

export function AresActionCenter({ data }: { data: any }) {
  // Combine alerts + insights into a single prioritized action queue
  const alerts = (data.alerts ?? []).map((a: any) => ({
    id: a.id,
    severity: a.severity,
    title: a.title,
    detail: a.message,
    source: a.source,
    kind: "alert",
  }));
  const insights = (data.insights ?? []).map((i: any) => ({
    id: i.id,
    severity: i.severity,
    title: i.title,
    detail: i.body,
    source: "AI",
    kind: "insight",
  }));
  const queue = [...alerts, ...insights].sort((a, b) => {
    const order: Record<string, number> = { URGENT: 0, ATTENTION: 1, INFO: 2 };
    return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-ares-line bg-white">
      <div className="flex items-center justify-between border-b border-ares-line p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ares-sea-deep text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Action center
            </div>
            <div className="text-sm font-semibold text-ares-navy">
              {queue.length} items A.R.E.S. surfaced
            </div>
          </div>
        </div>
      </div>
      <div className="max-h-[560px] overflow-y-auto ares-scroll p-3">
        <ul className="space-y-2">
          {queue.map((item) => {
            const sev =
              item.severity === "URGENT"
                ? { icon: AlertTriangle, color: "text-rose-600", dot: "bg-rose-500", label: "Urgent" }
                : item.severity === "ATTENTION"
                  ? { icon: Bell, color: "text-amber-600", dot: "bg-amber-500", label: "Attention" }
                  : { icon: CheckCircle2, color: "text-ares-sea-deep", dot: "bg-ares-sea", label: "Info" };
            return (
              <li
                key={item.id}
                className="rounded-xl border border-ares-line bg-white p-3.5 transition-all hover:border-ares-sea/30"
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${sev.dot}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${sev.color}`}>
                        {sev.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        · {item.source} · {item.kind}
                      </span>
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-ares-navy">
                      {item.title}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{item.detail}</div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <button className="inline-flex items-center gap-1 rounded-lg bg-ares-sea-deep px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-ares-navy">
                        Ask A.R.E.S.
                      </button>
                      <button className="rounded-lg border border-ares-line bg-white px-2.5 py-1 text-[11px] font-medium text-ares-navy transition-colors hover:border-ares-sea/40">
                        Review
                      </button>
                      <button className="rounded-lg border border-ares-line bg-white px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-rose-600">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
          {queue.length === 0 && (
            <li className="rounded-xl border border-dashed border-ares-line p-8 text-center text-sm text-muted-foreground">
              Nothing needs attention right now. A.R.E.S. is monitoring.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
