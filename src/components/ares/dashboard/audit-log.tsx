"use client";

import { ScrollText, Search } from "lucide-react";
import { useState } from "react";

export function AresAuditLog({ data }: { data: any }) {
  const activity = data.activity ?? [];
  const [q, setQ] = useState("");

  const filtered = activity.filter((a: any) =>
    !q
      ? true
      : `${a.actorName} ${a.action} ${a.tool ?? ""} ${a.result} ${a.riskLevel}`
          .toLowerCase()
          .includes(q.toLowerCase())
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-ares-line bg-white">
      <div className="flex items-center justify-between border-b border-ares-line p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ares-navy text-white">
            <ScrollText className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Audit log
            </div>
            <div className="text-sm font-semibold text-ares-navy">
              Every AI + human action, recorded
            </div>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search actions…"
            className="w-44 rounded-lg border border-ares-line bg-white py-1.5 pl-8 pr-2 text-xs text-ares-navy placeholder:text-muted-foreground focus:border-ares-sea/40 focus:outline-none"
          />
        </div>
      </div>

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
                  {new Date(a.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        a.actorType === "AI"
                          ? "bg-ares-sea"
                          : a.actorType === "USER"
                            ? "bg-ares-navy"
                            : "bg-slate-400"
                      }`}
                    />
                    <span className="font-medium text-ares-navy">{a.actorName}</span>
                    <span className="text-[10px] text-muted-foreground">({a.actorType.toLowerCase()})</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 font-mono text-ares-sea-deep">
                  {a.action.replace(/_/g, " ").toLowerCase()}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {a.tool ? <code className="rounded bg-ares-mist px-1 py-0.5 text-[10px]">{a.tool}</code> : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      a.riskLevel === "HIGH"
                        ? "bg-rose-100 text-rose-700"
                        : a.riskLevel === "MEDIUM"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {a.riskLevel}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      a.result === "SUCCESS"
                        ? "bg-emerald-50 text-emerald-700"
                        : a.result === "FAILURE"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {a.result.replace(/_/g, " ")}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No matching audit entries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
