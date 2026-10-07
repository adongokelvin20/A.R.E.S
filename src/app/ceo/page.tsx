"use client";
import { useState } from "react";
import { AresLogo } from "@/components/ares/logo";

export default function CEOLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [creds, setCreds] = useState({ username: "", password: "" });

  async function login(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/ceo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (data.authenticated) { setStats(data); setCreds({ username, password }); }
      else setError(data.error || "Invalid credentials");
    } catch { setError("Network error"); } finally { setLoading(false); }
  }

  async function manageBusiness(businessId: string, action: string, businessName: string) {
    if (action === "delete" && !confirm(`Permanently delete "${businessName}"? This removes ALL data.`)) return;
    try {
      const res = await fetch("/api/ceo/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...creds, action, businessId }) });
      const data = await res.json();
      if (data.ok) {
        const refreshRes = await fetch("/api/auth/ceo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(creds) });
        const refreshData = await refreshRes.json();
        if (refreshData.authenticated) setStats(refreshData);
      } else alert(data.error || "Failed");
    } catch { alert("Network error"); }
  }

  // ===== LOGIN SCREEN =====
  if (!stats) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
            <div className="mb-8 text-center">
              <AresLogo className="mx-auto h-16 w-16" />
              <h1 className="mt-4 text-xl font-bold text-slate-900">ChatBiz Admin</h1>
              <p className="mt-1 text-sm text-slate-400">Control Center · System Administrator</p>
            </div>
            <form onSubmit={login} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Username</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} type="text" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-800/10" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Password</label>
                <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-800/10" />
              </div>
              {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</div>}
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-300 disabled:opacity-50">
                {loading ? "Authenticating..." : "Access Control Center"}
              </button>
            </form>
          </div>
          <p className="mt-6 text-center text-xs text-slate-300">ChatBiz by Kevtech Corporation · Built by Kelvin Ayinbisa & Jessy</p>
        </div>
      </main>
    );
  }

  // ===== DASHBOARD =====
  const s = stats.stats;
  const businesses = stats.businesses || [];
  const activeRate = s.totalBusinesses > 0 ? Math.round((s.activeBusinesses / s.totalBusinesses) * 100) : 0;
  const confirmationRate = s.totalOrders > 0 ? Math.round((s.confirmedOrders / s.totalOrders) * 100) : 0;

  // Sector breakdown for pie chart
  const sectorMap: Record<string, number> = {};
  businesses.forEach((b) => { const sec = b.sector || "Other"; sectorMap[sec] = (sectorMap[sec] || 0) + 1; });
  const sectorEntries = Object.entries(sectorMap);
  const sectorColors = ["#0f172a", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

  // Revenue by business (top 5) for line chart
  const topByRevenue = [...businesses].filter(b => b.subscription?.amountPaid > 0).sort((a, b) => (b.subscription?.amountPaid || 0) - (a.subscription?.amountPaid || 0)).slice(0, 5);

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <AresLogo className="h-9 w-9" />
            <div>
              <h1 className="text-sm font-bold text-slate-900">ChatBiz Control Center</h1>
              <p className="text-[10px] text-slate-400">{new Date().toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}</p>
            </div>
          </div>
          <button onClick={() => setStats(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Sign Out</button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* KPI Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Total Revenue", value: `GHS ${s.totalRevenue.toFixed(2)}`, sub: `${s.activeBusinesses} active`, color: "bg-emerald-500", textColor: "text-emerald-600" },
            { label: "Businesses", value: s.totalBusinesses, sub: `${activeRate}% active`, color: "bg-blue-500", textColor: "text-blue-600" },
            { label: "Customers", value: s.totalCustomers, sub: `system-wide`, color: "bg-violet-500", textColor: "text-violet-600" },
            { label: "Orders", value: s.totalOrders, sub: `${confirmationRate}% confirmed`, color: "bg-amber-500", textColor: "text-amber-600" },
          ].map((kpi, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${kpi.color}`} />
                <span className="text-xs font-medium text-slate-400">{kpi.label}</span>
              </div>
              <div className={`text-2xl font-bold ${kpi.textColor}`}>{kpi.value}</div>
              <div className="mt-1 text-[11px] text-slate-300">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Revenue line chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Revenue by Business</h3>
            {topByRevenue.length > 0 ? (
              <div className="relative h-48">
                <svg viewBox="0 0 400 160" className="h-full w-full" preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[0, 40, 80, 120, 160].map((y) => (
                    <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                  ))}
                  {/* Line */}
                  <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={topByRevenue.map((b, i) => {
                      const x = (i / Math.max(topByRevenue.length - 1, 1)) * 380 + 10;
                      const maxRev = Math.max(...topByRevenue.map(b => b.subscription?.amountPaid || 0), 1);
                      const y = 150 - ((b.subscription?.amountPaid || 0) / maxRev) * 140;
                      return `${x},${y}`;
                    }).join(" ")}
                  />
                  {/* Area fill */}
                  <polygon
                    fill="url(#revGrad)"
                    points={`10,150 ${topByRevenue.map((b, i) => {
                      const x = (i / Math.max(topByRevenue.length - 1, 1)) * 380 + 10;
                      const maxRev = Math.max(...topByRevenue.map(b => b.subscription?.amountPaid || 0), 1);
                      const y = 150 - ((b.subscription?.amountPaid || 0) / maxRev) * 140;
                      return `${x},${y}`;
                    }).join(" ")} 390,150`}
                  />
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Dots */}
                  {topByRevenue.map((b, i) => {
                    const x = (i / Math.max(topByRevenue.length - 1, 1)) * 380 + 10;
                    const maxRev = Math.max(...topByRevenue.map(b => b.subscription?.amountPaid || 0), 1);
                    const y = 150 - ((b.subscription?.amountPaid || 0) / maxRev) * 140;
                    return <circle key={i} cx={x} cy={y} r="4" fill="#3b82f6" />;
                  })}
                </svg>
                <div className="mt-2 flex justify-between px-2">
                  {topByRevenue.map((b, i) => (
                    <div key={i} className="text-center" style={{ width: `${100 / topByRevenue.length}%` }}>
                      <div className="truncate text-[10px] text-slate-400">{b.name.slice(0, 8)}</div>
                      <div className="text-[10px] font-medium text-slate-600">GHS {(b.subscription?.amountPaid || 0).toFixed(0)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="py-12 text-center text-sm text-slate-300">No revenue data yet</p>}
          </div>

          {/* Sector pie chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Business Sectors</h3>
            {sectorEntries.length > 0 ? (
              <div className="flex flex-col items-center gap-4">
                <svg viewBox="0 0 100 100" className="h-32 w-32">
                  {(() => {
                    const total = businesses.length;
                    let offset = 0;
                    return sectorEntries.map(([sector, count], i) => {
                      const pct = count / total;
                      const dash = pct * 251.2;
                      const circle = (
                        <circle
                          key={i}
                          cx="50" cy="50" r="40"
                          fill="none"
                          stroke={sectorColors[i % sectorColors.length]}
                          strokeWidth="16"
                          strokeDasharray={`${dash} 251.2`}
                          strokeDashoffset={-offset}
                          transform="rotate(-90 50 50)"
                        />
                      );
                      offset += dash;
                      return circle;
                    });
                  })()}
                  <text x="50" y="48" textAnchor="middle" className="fill-slate-900 text-sm font-bold">{businesses.length}</text>
                  <text x="50" y="60" textAnchor="middle" className="fill-slate-400 text-[6px]">businesses</text>
                </svg>
                <div className="grid w-full grid-cols-2 gap-1.5">
                  {sectorEntries.map(([sector, count], i) => (
                    <div key={sector} className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: sectorColors[i % sectorColors.length] }} />
                      <span className="truncate text-[11px] text-slate-500">{sector}</span>
                      <span className="ml-auto text-[11px] font-medium text-slate-700">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="py-12 text-center text-sm text-slate-300">No data</p>}
          </div>
        </div>

        {/* Growth indicators */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <div className="text-xl font-bold text-emerald-600">{activeRate}%</div>
            <div className="text-[10px] text-slate-400">Active Rate</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <div className="text-xl font-bold text-blue-600">{confirmationRate}%</div>
            <div className="text-[10px] text-slate-400">Confirmation Rate</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <div className="text-xl font-bold text-violet-600">{s.totalBusinesses > 0 ? (s.totalCustomers / s.totalBusinesses).toFixed(1) : 0}</div>
            <div className="text-[10px] text-slate-400">Avg Customers/Business</div>
          </div>
        </div>

        {/* Business table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-900">All Businesses ({businesses.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/50">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Business</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Plan</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Orders</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Customers</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Expiry</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Paid</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{b.name}</div>
                      <div className="text-[10px] text-slate-300">{b.slug} · {b.sector}</div>
                    </td>
                    <td className="px-4 py-3"><span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{b.plan}</span></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${b.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600" : b.status === "SUSPENDED" ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500"}`}>
                        {b.status === "SUSPENDED" && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{b.orderCount}</td>
                    <td className="px-4 py-3 text-slate-600">{b.customerCount}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-400">{b.subscription?.currentPeriodEnd ? new Date(b.subscription.currentPeriodEnd).toLocaleDateString() : b.subscription?.trialEndsAt ? `Trial: ${new Date(b.subscription.trialEndsAt).toLocaleDateString()}` : "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{b.subscription?.amountPaid ? `GHS ${b.subscription.amountPaid.toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {b.status === "ACTIVE" ? (
                          <button onClick={() => manageBusiness(b.id, "suspend", b.name)} className="rounded-md bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-600 hover:bg-amber-100">Suspend</button>
                        ) : (
                          <button onClick={() => manageBusiness(b.id, "activate", b.name)} className="rounded-md bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-600 hover:bg-emerald-100">Activate</button>
                        )}
                        <button onClick={() => manageBusiness(b.id, "delete", b.name)} className="rounded-md bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-100">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
