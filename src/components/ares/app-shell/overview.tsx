"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, ShoppingBag, Users, Package, ArrowRight, Sparkles, AlertTriangle, BarChart3, PieChart, Activity, Brain, Loader2, Clock, MapPin, Store, Copy, Check, ExternalLink } from "lucide-react";
import { useId } from "react";
import { toast } from "@/hooks/use-toast";

export function AresOverview({
  data,
  onNavigate,
}: {
  data: any;
  onNavigate: (v: string) => void;
}) {
  const k = data.kpis;
  const currency = data.business.currency;
  const symbol = currency === "GHS" ? "GH₵" : currency === "NGN" ? "₦" : currency === "KES" ? "KSh" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency;
  const agentName = data.business.agentName;
  const ownerFirst = data.business.ownerFirstName || "there";
  const sectorLabel = data.business.sectorLabel ?? "business";
  const widgets: string[] = data.business.widgets ?? ["greeting", "kpis", "revenue_chart", "recent_activity"];
  const learnings: string[] = data.business.learnings ?? [];
  const up = k.revenueDeltaPct >= 0;

  // Fetch the AI greeting (warm welcome on login)
  const [greeting, setGreeting] = useState<string | null>(null);
  const [greetingLoading, setGreetingLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    fetch("/api/ares/greeting")
      .then((r) => r.json())
      .then((j) => { if (mounted && j.greeting) setGreeting(j.greeting); })
      .catch(() => {})
      .finally(() => { if (mounted) setGreetingLoading(false); });
    return () => { mounted = false; };
  }, []);

  const cards = [
    { label: "Revenue today", value: `${symbol}${k.todayRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, delta: `${up ? "+" : ""}${k.revenueDeltaPct}%`, trend: up ? "up" : "down", icon: TrendingUp, accent: true, show: true },
    { label: "Orders today", value: String(k.todayOrderCount), delta: `${k.pendingOrders} pending`, trend: k.pendingOrders > 0 ? "down" : "up", icon: ShoppingBag, show: true },
    { label: "Customers", value: String(k.customerCount), delta: "all time", trend: "up", icon: Users, show: k.customerCount > 0 || true },
    { label: "Products", value: String(k.totalProducts), delta: `${k.lowStockCount} low stock`, trend: k.lowStockCount > 0 ? "down" : "up", icon: Package, show: true },
  ];

  return (
    <div className="space-y-5">
      {/* Warm greeting from the AI -- always first */}
      {widgets.includes("greeting") && (
        <div className="relative overflow-hidden rounded-2xl border border-ares-sea/20 bg-gradient-to-br from-ares-navy via-ares-sea-deep to-ares-sea-deep p-5 text-white sm:p-6">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-ares-sea/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-ares-sea/20 blur-3xl" />
          <div className="relative flex items-start gap-3">
            <div className="relative shrink-0">
              <div className="ares-avatar-glow h-12 w-12 overflow-hidden rounded-full">
                <img
                  src="/images/ai-avatar.jpg"
                  alt={agentName}
                  className="ares-avatar-breathe h-full w-full object-cover"
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                {agentName} · {sectorLabel}
              </div>
              <div className="mt-2 text-sm leading-relaxed text-white/95">
                {greetingLoading ? (
                  <span className="inline-flex items-center gap-2 text-white/70">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {agentName} is saying hi...
                  </span>
                ) : greeting ? (
                  greeting
                ) : (
                  `Hey ${ownerFirst} -- ${agentName} here. Let's make today count.`
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => onNavigate("products")} className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25">
                  Add a product →
                </button>
                <button onClick={() => onNavigate("integrations")} className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25">
                  Connect WhatsApp →
                </button>
                <button onClick={() => onNavigate("ai")} className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25">
                  Talk to {agentName} →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Store link card — the owner's public store URL where customers can chat */}
      <StoreLinkCard slug={data.business.slug} businessName={data.business.name} />

      {/* KPIs */}
      {widgets.includes("kpis") && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {cards.filter((c) => c.show).map((c) => (
            <div key={c.label} className={`relative overflow-hidden rounded-2xl border p-4 ${c.accent ? "border-ares-sea/30 bg-gradient-to-br from-ares-foam to-white" : "border-ares-line bg-white"}`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{c.label}</span>
                <c.icon className={`h-4 w-4 ${c.accent ? "text-ares-sea-deep" : "text-muted-foreground"}`} />
              </div>
              <div className="mt-2 font-mono text-2xl font-bold text-ares-navy sm:text-3xl">{c.value}</div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                {c.trend === "up" ? <TrendingUp className="h-3 w-3 text-emerald-600" /> : <TrendingDown className="h-3 w-3 text-rose-600" />}
                <span className={`font-semibold ${c.trend === "up" ? "text-emerald-600" : "text-rose-600"}`}>{c.delta}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts row -- only show if widget is enabled and there's data */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {widgets.includes("revenue_chart") && (
          <div className="lg:col-span-2">
            <RevenueChart data={data} />
          </div>
        )}
        {widgets.includes("channel_chart") && <ChannelDonut data={data} />}
        {widgets.includes("appointments_today") && <AppointmentsWidget data={data} />}
        {widgets.includes("low_stock") && !widgets.includes("revenue_chart") && <LowStockWidget data={data} onNavigate={onNavigate} />}
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {widgets.includes("top_products") && <TopProductsChart data={data} onNavigate={onNavigate} />}
        {widgets.includes("orders_today") && <OrdersTodayWidget data={data} onNavigate={onNavigate} />}
        {widgets.includes("recent_activity") && <RecentActivityWidget data={data} />}
        {widgets.includes("learnings") && <LearningsWidget learnings={learnings} agentName={agentName} />}
        {widgets.includes("low_stock") && widgets.includes("revenue_chart") && <LowStockWidget data={data} onNavigate={onNavigate} />}
        {widgets.includes("pie_chart") && <OrderStatusPie data={data} />}
      </div>

      {/* Empty state for products */}
      {widgets.includes("kpis") && k.totalProducts === 0 && (
        <div className="rounded-2xl border border-dashed border-ares-sea/30 bg-white p-6 text-center">
          <Package className="mx-auto h-8 w-8 text-ares-sea-deep" />
          <h3 className="mt-3 text-sm font-semibold text-ares-navy">No products yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">{agentName} needs products in the catalog to answer customer questions accurately.</p>
          <button onClick={() => onNavigate("products")} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-ares-navy px-4 py-2 text-xs font-semibold text-white hover:bg-ares-sea-deep">
            Add your first product <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Alerts */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="rounded-2xl border border-ares-line bg-white p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-ares-navy">Alerts</h3>
          </div>
          <ul className="mt-3 space-y-2">
            {data.alerts.slice(0, 5).map((a: any) => (
              <li key={a.id} className="flex items-start gap-2 text-xs">
                <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${a.severity === "URGENT" ? "bg-rose-500" : a.severity === "ATTENTION" ? "bg-amber-500" : "bg-ares-sea"}`} />
                <div>
                  <div className="font-medium text-ares-navy">{a.title}</div>
                  <div className="text-muted-foreground">{a.message}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ============ Revenue chart ============ */
function RevenueChart({ data }: { data: any }) {
  const series: { date: string; revenue: number; orders: number }[] = data.series ?? [];
  const gradientId = useId();
  const width = 760, height = 220;
  const padding = { top: 20, right: 16, bottom: 28, left: 48 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const maxRevenue = Math.max(...series.map((s) => s.revenue), 1);
  const points = series.map((s, i) => ({
    x: padding.left + (i / Math.max(series.length - 1, 1)) * innerW,
    y: padding.top + innerH - (s.revenue / maxRevenue) * innerH,
    ...s,
  }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const areaPath = `M ${points[0]?.x ?? 0} ${padding.top + innerH} ` + points.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ") + ` L ${points[points.length - 1]?.x ?? 0} ${padding.top + innerH} Z`;
  const total = series.reduce((s, p) => s + p.revenue, 0);

  if (series.length === 0 || total === 0) {
    return (
      <div className="rounded-2xl border border-ares-line bg-white p-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-ares-sea-deep" />
          <div className="text-sm font-semibold text-ares-navy">Revenue · last 14 days</div>
        </div>
        <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">No revenue yet. Orders will populate this chart.</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ares-line bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-ares-sea-deep" />
            <div className="text-sm font-semibold text-ares-navy">Revenue · last 14 days</div>
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-ares-navy">
            {data.business.currency === "GHS" ? "GH₵" : data.business.currency} {total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-ares-foam px-2 py-1 text-xs font-medium text-ares-sea-deep">
          <span className="h-2 w-2 rounded-full bg-ares-sea" /> Revenue
        </span>
      </div>
      <div className="mt-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284A6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0284A6" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = padding.top + t * innerH;
            return <line key={t} x1={padding.left} y1={y} x2={padding.left + innerW} y2={y} stroke="#E4ECF1" strokeDasharray="3 3" />;
          })}
          {[0, 0.5, 1].map((t) => {
            const y = padding.top + (1 - t) * innerH;
            return <text key={t} x={padding.left - 8} y={y + 3} fontSize="9" fill="#5C6B7A" textAnchor="end" fontFamily="monospace">{Math.round(t * maxRevenue)}</text>;
          })}
          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke="#024E6E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#0284A6" stroke="white" strokeWidth="1.5" />)}
          {points.map((p, i) => i % 2 === 0 ? <text key={i} x={p.x} y={height - 8} fontSize="9" fill="#5C6B7A" textAnchor="middle" fontFamily="monospace">{p.date}</text> : null)}
        </svg>
      </div>
    </div>
  );
}

/* ============ Channel donut ============ */
function ChannelDonut({ data }: { data: any }) {
  const channels: { name: string; value: number }[] = data.channelBreakdown ?? [];
  const total = channels.reduce((s, c) => s + c.value, 0) || 1;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const colors: Record<string, string> = { WHATSAPP: "#25D366", WEB: "#0284A6", INSTORE: "#7AB8CC", CALL: "#0A1626", SMS: "#38BDF8", EMAIL: "#1A5694" };
  const segments = channels.map((c, i) => {
    const pct = c.value / total;
    const dash = pct * circumference;
    const offset = channels.slice(0, i).reduce((s, x) => s + (x.value / total) * circumference, 0);
    return { ...c, dash, offset, color: colors[c.name] ?? "#0284A6" };
  });

  return (
    <div className="rounded-2xl border border-ares-line bg-white p-5">
      <div className="flex items-center gap-2"><PieChart className="h-4 w-4 text-ares-sea-deep" /><div className="text-sm font-semibold text-ares-navy">Orders by channel</div></div>
      {channels.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">No orders yet.</div>
      ) : (
        <div className="mt-3 flex items-center gap-5">
          <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
              {segments.map((s, i) => <circle key={i} cx="80" cy="80" r={radius} fill="none" stroke={s.color} strokeWidth="14" strokeDasharray={`${s.dash} ${circumference - s.dash}`} strokeDashoffset={-s.offset} />)}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-mono text-2xl font-bold text-ares-navy">{total}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">orders</div>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {channels.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colors[c.name] ?? "#0284A6" }} />
                  <span className="font-medium text-ares-navy">{c.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{Math.round((c.value / total) * 100)}%</span>
                  <span className="font-mono font-semibold text-ares-navy">{c.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ Appointments widget (for clinics, salons, etc.) ============ */
function AppointmentsWidget({ data }: { data: any }) {
  // For sectors with appointments, show today's count
  const todayOrders = data.kpis?.todayOrderCount ?? 0;
  const pending = data.kpis?.pendingOrders ?? 0;
  return (
    <div className="rounded-2xl border border-ares-line bg-white p-5">
      <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-ares-sea-deep" /><div className="text-sm font-semibold text-ares-navy">Today's schedule</div></div>
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between rounded-lg bg-ares-mist p-3">
          <span className="text-xs text-muted-foreground">Today</span>
          <span className="font-mono text-lg font-bold text-ares-navy">{todayOrders}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-ares-mist p-3">
          <span className="text-xs text-muted-foreground">Pending confirmation</span>
          <span className="font-mono text-lg font-bold text-amber-600">{pending}</span>
        </div>
        {todayOrders === 0 && (
          <p className="text-center text-[11px] text-muted-foreground">No appointments scheduled for today yet.</p>
        )}
      </div>
    </div>
  );
}

/* ============ Orders today widget ============ */
function OrdersTodayWidget({ data, onNavigate }: { data: any; onNavigate: (v: string) => void }) {
  return (
    <div className="rounded-2xl border border-ares-line bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-ares-sea-deep" /><div className="text-sm font-semibold text-ares-navy">Recent orders</div></div>
        <button onClick={() => onNavigate("orders")} className="text-[11px] font-medium text-ares-sea-deep hover:underline">View all →</button>
      </div>
      <div className="mt-3 space-y-2">
        {(data.activity ?? []).filter((a: any) => a.action?.includes("ORDER")).slice(0, 5).map((a: any) => (
          <div key={a.id} className="flex items-center justify-between rounded-lg border border-ares-line p-2.5">
            <div>
              <div className="text-xs font-medium text-ares-navy">{a.action.replace(/_/g, " ").toLowerCase()}</div>
              <div className="text-[10px] text-muted-foreground">{new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${a.result === "SUCCESS" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{a.result}</span>
          </div>
        ))}
        {(data.activity ?? []).filter((a: any) => a.action?.includes("ORDER")).length === 0 && (
          <p className="py-4 text-center text-[11px] text-muted-foreground">No orders yet today.</p>
        )}
      </div>
    </div>
  );
}

/* ============ Low stock widget ============ */
function LowStockWidget({ data, onNavigate }: { data: any; onNavigate: (v: string) => void }) {
  const lowStock = data.lowStock ?? [];
  return (
    <div className="rounded-2xl border border-ares-line bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /><div className="text-sm font-semibold text-ares-navy">Low stock</div></div>
        <button onClick={() => onNavigate("products")} className="text-[11px] font-medium text-ares-sea-deep hover:underline">Manage →</button>
      </div>
      {lowStock.length === 0 ? (
        <p className="py-4 text-center text-[11px] text-muted-foreground">All products are well-stocked.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {lowStock.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-ares-line p-2.5">
              <span className="text-xs font-medium text-ares-navy">{p.name}</span>
              <span className="font-mono text-xs font-bold text-rose-600">{p.stock} left</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ Top products ============ */
function TopProductsChart({ data, onNavigate }: { data: any; onNavigate: (v: string) => void }) {
  const products: { id: string; name: string; price: number; stock: number }[] = data.topProducts ?? [];
  const maxStock = Math.max(...products.map((p) => p.stock), 1);
  return (
    <div className="rounded-2xl border border-ares-line bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Package className="h-4 w-4 text-ares-sea-deep" /><div className="text-sm font-semibold text-ares-navy">Top products</div></div>
        <button onClick={() => onNavigate("products")} className="text-[11px] font-medium text-ares-sea-deep hover:underline">View all →</button>
      </div>
      {products.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">No products yet.</div>
      ) : (
        <div className="mt-4 space-y-3">
          {products.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ares-foam font-mono text-xs font-bold text-ares-sea-deep">{i + 1}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-ares-navy">{p.name}</span>
                  <span className="font-mono text-xs text-ares-sea-deep">GH₵ {p.price.toFixed(0)}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ares-mist">
                  <div className="h-full rounded-full bg-gradient-to-r from-ares-sea to-ares-sea-deep" style={{ width: `${(p.stock / maxStock) * 100}%` }} />
                </div>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">{p.stock} left</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ Recent activity ============ */
function RecentActivityWidget({ data }: { data: any }) {
  const activity = (data.activity ?? []).slice(0, 8);
  return (
    <div className="rounded-2xl border border-ares-line bg-white p-5">
      <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-ares-sea-deep" /><div className="text-sm font-semibold text-ares-navy">Recent activity</div></div>
      {activity.length === 0 ? (
        <p className="py-4 text-center text-[11px] text-muted-foreground">No activity yet.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {activity.map((a: any) => (
            <div key={a.id} className="flex items-start gap-2.5 text-xs">
              <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${a.actorType === "AI" ? "bg-ares-sea" : a.actorType === "USER" ? "bg-ares-navy" : "bg-slate-400"}`} />
              <div className="flex-1">
                <span className="font-medium text-ares-navy">{a.actorName}</span>
                <span className="text-muted-foreground"> · {a.action.replace(/_/g, " ").toLowerCase()}</span>
                <div className="text-[10px] text-muted-foreground">{new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ Learnings widget (AI memory) ============ */
function LearningsWidget({ learnings, agentName }: { learnings: string[]; agentName: string }) {
  return (
    <div className="rounded-2xl border border-ares-sea/20 bg-gradient-to-br from-ares-foam/30 to-white p-5">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-ares-sea-deep" />
        <div className="text-sm font-semibold text-ares-navy">What {agentName} has learned</div>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{agentName} picks up details from customer conversations and remembers them.</p>
      {learnings.length === 0 ? (
        <p className="mt-3 py-4 text-center text-[11px] text-muted-foreground">No learnings yet -- {agentName} will start remembering things as you chat with customers.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {learnings.slice(-5).reverse().map((l, i) => (
            <div key={i} className="rounded-lg border border-ares-line bg-white p-2.5">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-ares-sea-deep" />
                <span className="text-xs text-ares-navy">{l}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ Order status pie chart ============ */
function OrderStatusPie({ data }: { data: any }) {
  const statuses: { name: string; value: number }[] = data.statusBreakdown ?? [];
  const total = statuses.reduce((s, c) => s + c.value, 0) || 1;
  const colors: Record<string, string> = {
    PENDING: "#F59E0B",
    CONFIRMED: "#0284A6",
    FULFILLED: "#10B981",
    CANCELLED: "#94A3B8",
    REFUNDED: "#EF4444",
  };
  const labels: Record<string, string> = {
    PENDING: "Pending",
    CONFIRMED: "Confirmed",
    FULFILLED: "Closed",
    CANCELLED: "Cancelled",
    REFUNDED: "Refunded",
  };
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const segments = statuses.map((c, i) => {
    const pct = c.value / total;
    const dash = pct * circumference;
    const offset = statuses.slice(0, i).reduce((s, x) => s + (x.value / total) * circumference, 0);
    return { ...c, dash, offset, color: colors[c.name] ?? "#0284A6" };
  });

  return (
    <div className="rounded-2xl border border-ares-line bg-white p-5">
      <div className="flex items-center gap-2">
        <PieChart className="h-4 w-4 text-ares-sea-deep" />
        <div className="text-sm font-semibold text-ares-navy">Order status</div>
      </div>
      {statuses.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">No orders yet.</div>
      ) : (
        <div className="mt-3 flex items-center gap-5">
          <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
              {segments.map((s, i) => (
                <circle key={i} cx="80" cy="80" r={radius} fill="none" stroke={s.color} strokeWidth="14" strokeDasharray={`${s.dash} ${circumference - s.dash}`} strokeDashoffset={-s.offset} />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-mono text-2xl font-bold text-ares-navy">{total}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">orders</div>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {statuses.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[s.name] ?? "#0284A6" }} />
                  <span className="font-medium text-ares-navy">{labels[s.name] ?? s.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{Math.round((s.value / total) * 100)}%</span>
                  <span className="font-mono font-semibold text-ares-navy">{s.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ Store link card ============ */
function StoreLinkCard({ slug, businessName }: { slug: string; businessName: string }) {
  const [copied, setCopied] = useState(false);
  // Compute the store URL on the client only (window is unavailable during SSR).
  // This is the standard "client-only value" pattern.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);
  const storeUrl = mounted && slug && typeof window !== "undefined" ? `${window.location.origin}/store/${slug}` : "";

  async function copyLink() {
    if (!storeUrl) return;
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      toast({ title: "Store link copied", description: "Share it with your customers." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = storeUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      toast({ title: "Store link copied", description: "Share it with your customers." });
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!storeUrl) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-ares-sea/20 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Store className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-ares-navy">Your online store</div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Customers visit this link to browse your products and chat with {businessName}&apos;s assistant — no WhatsApp needed. Share it anywhere.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg border border-ares-line bg-ares-mist/50 px-3 py-2 text-[11px] text-ares-navy">
                {storeUrl}
              </code>
              <button
                onClick={copyLink}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ares-navy px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-ares-sea-deep"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-ares-line bg-white px-3 py-2 text-xs font-semibold text-ares-navy hover:bg-ares-mist"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
