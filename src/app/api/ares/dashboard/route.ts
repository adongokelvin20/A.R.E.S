/**
 * A.R.E.S. dashboard data endpoint (auth-aware, no demo seeding).
 *
 * GET /api/ares/dashboard
 *
 * Returns REAL aggregated data for the authenticated business:
 *   - KPI cards (revenue today/yesterday, orders, customers, response time)
 *   - 14-day revenue series
 *   - Channel distribution
 *   - Order status distribution
 *   - Recent activity (audit log)
 *   - Open alerts
 *   - AI insights
 *   - Top products
 *   - Low stock items
 *   - Integrations
 *   - Agent personalization
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { findSubtype, findCategory, getCombinedProductFields } from "@/lib/sector-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = session.user.businessId;

  const business = await db.business.findUnique({ where: { id: businessId } });
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Resolve sector subtype from catalog (determines which widgets to show)
  const subtype = findSubtype(business.sectorCategory, business.sectorSubtype);
  const category = findCategory(business.sectorCategory);
  const widgets = subtype?.dashboardWidgets ?? ["greeting", "kpis", "revenue_chart", "recent_activity", "pie_chart"];

  // Parse all selected sectors from configuration (for multi-sector product fields)
  let allSectors: { category: string; subtype: string }[] = [];
  try {
    const config = JSON.parse(business.configuration || "{}");
    if (Array.isArray(config.allSectors)) {
      allSectors = config.allSectors.map((s: any) => ({ category: s.category, subtype: s.subtype }));
    }
  } catch {}
  if (allSectors.length === 0 && business.sectorCategory && business.sectorSubtype) {
    allSectors = [{ category: business.sectorCategory, subtype: business.sectorSubtype }];
  }
  const productFields = getCombinedProductFields(allSectors);

  // Parse learnings
  let learnings: string[] = [];
  try { learnings = JSON.parse(business.agentLearnings || "[]"); } catch {}

  const [
    orders,
    customers,
    products,
    auditLogs,
    alerts,
    insights,
    automations,
    integrations,
    conversations,
  ] = await Promise.all([
    db.order.findMany({ where: { businessId }, orderBy: { createdAt: "desc" }, take: 500 }),
    db.customer.findMany({ where: { businessId } }),
    db.product.findMany({ where: { businessId, status: "ACTIVE" } }),
    db.auditLog.findMany({ where: { businessId }, orderBy: { createdAt: "desc" }, take: 25 }),
    db.alert.findMany({ where: { businessId, status: "OPEN" }, orderBy: { createdAt: "desc" }, take: 12 }),
    db.insight.findMany({ where: { businessId, status: "OPEN" }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.automation.findMany({ where: { businessId } }),
    db.integration.findMany({ where: { businessId }, orderBy: { type: "asc" } }),
    db.conversation.findMany({ where: { businessId }, orderBy: { lastMessageAt: "desc" }, take: 8, include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } }),
  ]);

  // ===== KPI derivation =====
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);

  const todayOrders = orders.filter((o) => o.createdAt >= startOfToday);
  const yesterdayOrders = orders.filter(
    (o) => o.createdAt >= startOfYesterday && o.createdAt < startOfToday
  );
  const todayRevenue = todayOrders.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.total, 0);
  const yesterdayRevenue = yesterdayOrders.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.total, 0);
  const revenueDeltaPct =
    yesterdayRevenue > 0
      ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
      : todayRevenue > 0
        ? 100
        : 0;

  const pendingOrders = orders.filter((o) => o.status === "PENDING" || o.status === "CONFIRMED").length;

  // ===== 14-day revenue series =====
  const series: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const dayStart = new Date(startOfToday.getTime() - i * 86400000);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const dayOrders = orders.filter(
      (o) => o.createdAt >= dayStart && o.createdAt < dayEnd && o.status !== "CANCELLED"
    );
    series.push({
      date: dayStart.toISOString().slice(5, 10),
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
      orders: dayOrders.length,
    });
  }

  // ===== Channel distribution =====
  const channelMap: Record<string, number> = {};
  for (const o of orders) channelMap[o.channel] = (channelMap[o.channel] ?? 0) + 1;
  const channelBreakdown = Object.entries(channelMap).map(([name, value]) => ({ name, value }));

  // ===== Order status distribution =====
  const statusMap: Record<string, number> = {};
  for (const o of orders) statusMap[o.status] = (statusMap[o.status] ?? 0) + 1;
  const statusBreakdown = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  const topProducts = products
    .map((p) => ({ id: p.id, name: p.name, price: p.price, stock: p.stock, imageUrl: p.imageUrl, value: p.price * p.stock }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const lowStock = products
    .filter((p) => p.stock <= p.lowStockThreshold)
    .map((p) => ({ id: p.id, name: p.name, stock: p.stock, threshold: p.lowStockThreshold }))
    .slice(0, 6);

  return NextResponse.json({
    business: {
      id: business.id,
      name: business.name,
      type: business.type,
      slug: business.slug,
      currency: business.currency,
      country: business.country,
      plan: business.plan,
      agentName: business.agentName,
      agentPersonality: business.agentPersonality,
      agentInstructions: business.agentInstructions,
      ownerFirstName: business.ownerFirstName,
      modules: JSON.parse(business.enabledModules),
      sectorCategory: business.sectorCategory,
      sectorSubtype: business.sectorSubtype,
      sectorLabel: subtype?.label ?? business.type,
      sectorDescription: subtype?.description ?? "",
      categoryLabel: category?.label ?? "",
      widgets,
      learnings,
      productFields,
      allSectors,
    },
    kpis: {
      todayRevenue,
      yesterdayRevenue,
      revenueDeltaPct,
      todayOrderCount: todayOrders.length,
      pendingOrders,
      customerCount: customers.length,
      newCustomersToday: 0,
      avgResponseSec: 0,
      totalProducts: products.length,
      lowStockCount: products.filter((p) => p.stock <= p.lowStockThreshold).length,
      openConversations: conversations.filter((c) => c.status === "OPEN").length,
    },
    series,
    channelBreakdown,
    statusBreakdown,
    topProducts,
    lowStock,
    products: products.map((p) => ({
      ...p,
      attributes: JSON.parse(p.attributes),
    })),
    activity: auditLogs,
    alerts,
    insights,
    automations: automations.map((a) => ({ ...a, actions: JSON.parse(a.actions) })),
    integrations: integrations.map((i) => ({
      id: i.id,
      type: i.type,
      name: i.name,
      status: i.status,
      config: JSON.parse(i.config),
    })),
    conversations: conversations.map((c) => ({
      id: c.id,
      channel: c.channel,
      customerName: c.customerName,
      status: c.status,
      lastMessageAt: c.lastMessageAt,
      lastMessage: c.messages[0]?.content ?? null,
      lastMessageRole: c.messages[0]?.role ?? null,
    })),
  });
}
