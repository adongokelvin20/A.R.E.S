"use client";

import { useState } from "react";
import { ScrollText, Search } from "lucide-react";

export function AresAudit({ data }: { data: any }) {
  const activity = data.activity ?? [];
  const [q, setQ] = useState("");

  const filtered = activity.filter((a: any) =>
    !q
      ? true
      : `${a.actorName} ${a.action} ${a.tool ?? ""} ${a.result} ${a.riskLevel}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ares-navy">Audit log</h2>
          <p className="text-xs text-muted-foreground">Every AI + human + system action, recorded</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search actions…"
            className="w-56 rounded-lg border border-ares-line bg-white py-1.5 pl-8 pr-2 text-xs text-ares-navy focus:border-ares-sea/40 focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-ares-line bg-white">
        <div className="overflow-x-auto ares-scroll">
          <table className="w-full text-xs">
            <thead className="bg-ares-mist text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Time</th>
                <th className="px-4 py-2.5 text-left font-medium">Actor</th>
                <th className="px-4 py-2.5 text-left font-medium">Action</th>
                <th className="px-4 py-2.5 text-left font-medium">Tool</th>
                <th className="px-4 py-2.5 text-left font-medium">Risk</th>
                <th className="px-4 py-2.5 text-left font-medium">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ares-line">
              {filtered.map((a: any) => (
                <tr key={a.id} className="hover:bg-ares-mist/50">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${a.actorType === "AI" ? "bg-ares-sea" : a.actorType === "USER" ? "bg-ares-navy" : "bg-slate-400"}`} />
                      <span className="font-medium text-ares-navy">{a.actorName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-ares-sea-deep">
                    {a.action.replace(/_/g, " ").toLowerCase()}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {a.tool ? <code className="rounded bg-ares-mist px-1 py-0.5 text-[10px]">{a.tool}</code> : "--"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      a.riskLevel === "HIGH" ? "bg-rose-100 text-rose-700" : a.riskLevel === "MEDIUM" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                    }`}>
                      {a.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      a.result === "SUCCESS" ? "bg-emerald-50 text-emerald-700" : a.result === "FAILURE" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {a.result.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    <ScrollText className="mx-auto mb-2 h-6 w-6" />
                    No audit entries yet. Actions will appear here as you and your AI work.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
