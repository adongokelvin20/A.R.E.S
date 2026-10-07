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
import { db, ensureDatabase } from "@/lib/db";
import { findSubtype, findCategory, getCombinedProductFields } from "@/lib/sector-catalog";
import { checkAndArchiveWeek } from "@/lib/weekly-archive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Safe JSON parse — never throws, returns fallback on error
function safeJsonParse<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try { return JSON.parse(str) as T; } catch { return fallback; }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = session.user.businessId;

  // Ensure DB tables exist
  try { await ensureDatabase(); } catch {}

  // Always ensure Product table has the new image2Data/image3Data columns
  // (ensureDatabase may have been cached as 'done' on a warm function instance
  // from before the schema change, so the ALTER TABLE never ran)
  try {
    await db.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "image2Data" TEXT`);
    await db.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "image3Data" TEXT`);
  } catch {}

  // Load business (check suspended status + full record)
  let business;
  try {
    business = await db.business.findUnique({ where: { id: businessId } });
  } catch (e) {
    console.error("[dashboard] business lookup failed:", e);
    return NextResponse.json({ error: "Database error. Please try refreshing the page." }, { status: 500 });
  }
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });
  if (business.status === "SUSPENDED") return NextResponse.json({ error: "This account has been suspended. Please contact support.", suspended: true }, { status: 403 });

  // Check if we need to archive the previous week (runs on dashboard load)
  try { await checkAndArchiveWeek(businessId); } catch (e) {
    console.error("[dashboard] weekly archive check failed:", e);
  }

  // Resolve sector subtype from catalog (determines which widgets to show)
  const subtype = findSubtype(business.sectorCategory, business.sectorSubtype);
  const category = findCategory(business.sectorCategory);
  const widgets = subtype?.dashboardWidgets ?? ["greeting", "kpis", "revenue_chart", "recent_activity", "pie_chart"];

  // Parse all selected sectors from configuration (for multi-sector product fields)
  let allSectors: { category: string; subtype: string }[] = [];
  let paymentInfo = "";
  try {
    const config = JSON.parse(business.configuration || "{}");
    if (Array.isArray(config.allSectors)) {
      allSectors = config.allSectors.map((s: any) => ({ category: s.category, subtype: s.subtype }));
    }
    if (config.paymentInfo) paymentInfo = config.paymentInfo;
  } catch {}
  if (allSectors.length === 0 && business.sectorCategory && business.sectorSubtype) {
    allSectors = [{ category: business.sectorCategory, subtype: business.sectorSubtype }];
  }
  const productFields = getCombinedProductFields(allSectors);

  // Parse learnings
  let learnings: string[] = safeJsonParse(business.agentLearnings, []);

  let orders: any[] = [], customers: any[] = [], products: any[] = [], auditLogs: any[] = [], alerts: any[] = [], insights: any[] = [], automations: any[] = [], integrations: any[] = [], conversations: any[] = [];
  try {
    [
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
      // Use select to avoid querying image2Data/image3Data columns which may not exist
      // on the production DB yet (ALTER TABLE only runs on cold starts)
      db.product.findMany({
        where: { businessId, status: "ACTIVE" },
        select: {
          id: true, name: true, description: true, category: true, price: true,
          currency: true, stock: true, lowStockThreshold: true, imageUrl: true,
          imageAlt: true, attributes: true, status: true, createdAt: true,
        },
      }),
      db.auditLog.findMany({ where: { businessId }, orderBy: { createdAt: "desc" }, take: 25 }),
      db.alert.findMany({ where: { businessId, status: "OPEN" }, orderBy: { createdAt: "desc" }, take: 12 }),
      db.insight.findMany({ where: { businessId, status: "OPEN" }, orderBy: { createdAt: "desc" }, take: 8 }),
      db.automation.findMany({ where: { businessId } }),
      db.integration.findMany({ where: { businessId }, orderBy: { type: "asc" } }),
      db.conversation.findMany({ where: { businessId }, orderBy: { lastMessageAt: "desc" }, take: 8, include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } }),
    ]);
  } catch (e: any) {
    console.error("[dashboard] DB query failed:", e?.message);
    // Return minimal data so the dashboard still renders
    return NextResponse.json({
      business: {
        id: business.id, name: business.name, type: business.type, slug: business.slug,
        currency: business.currency, country: business.country, plan: business.plan,
        agentName: business.agentName, agentPersonality: business.agentPersonality,
        agentInstructions: business.agentInstructions, ownerFirstName: business.ownerFirstName,
        modules: safeJsonParse(business.enabledModules, []),
        configuration: business.configuration || "{}",
        sectorCategory: business.sectorCategory, sectorSubtype: business.sectorSubtype,
        sectorLabel: subtype?.label ?? business.type, sectorDescription: subtype?.description ?? "",
        categoryLabel: category?.label ?? "",
        widgets, learnings, productFields: [], allSectors, paymentInfo,
      },
      kpis: { todayRevenue: 0, yesterdayRevenue: 0, revenueDeltaPct: 0, todayOrderCount: 0, pendingOrders: 0, customerCount: 0, newCustomersToday: 0, avgResponseSec: 0, totalProducts: 0, lowStockCount: 0, openConversations: 0 },
      series: [], channelBreakdown: [], statusBreakdown: [], topProducts: [], lowStock: [],
      products: [], activity: [], alerts: [], insights: [], automations: [], integrations: [], conversations: [],
      error: "Some data failed to load. Please refresh to try again.",
    });
  }

  // ===== KPI derivation =====
  try {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);

  const todayOrders = orders.filter((o) => o.createdAt >= startOfToday);
  const yesterdayOrders = orders.filter(
    (o) => o.createdAt >= startOfYesterday && o.createdAt < startOfToday
  );
  // CONFIRMED = payment verified (previously misnamed FULFILLED)
  const todayRevenue = todayOrders.filter((o) => o.status === "CONFIRMED").reduce((s, o) => s + o.total, 0);
  const yesterdayRevenue = yesterdayOrders.filter((o) => o.status === "CONFIRMED").reduce((s, o) => s + o.total, 0);
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
      (o) => o.createdAt >= dayStart && o.createdAt < dayEnd && o.status === "CONFIRMED"
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
      modules: safeJsonParse(business.enabledModules, []),
      configuration: business.configuration || "{}",
      sectorCategory: business.sectorCategory,
      sectorSubtype: business.sectorSubtype,
      sectorLabel: subtype?.label ?? business.type,
      sectorDescription: subtype?.description ?? "",
      categoryLabel: category?.label ?? "",
      widgets,
      learnings,
      productFields,
      allSectors,
      paymentInfo,
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
      attributes: safeJsonParse(p.attributes, {}),
    })),
    activity: auditLogs,
    alerts,
    insights,
    automations: automations.map((a) => ({ ...a, actions: safeJsonParse(a.actions, []) })),
    integrations: integrations.map((i) => ({
      id: i.id,
      type: i.type,
      name: i.name,
      status: i.status,
      config: safeJsonParse(i.config, {}),
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
  } catch (e: any) {
    console.error("[dashboard] response build failed:", e?.message);
    return NextResponse.json({
      business: {
        id: business.id, name: business.name, type: business.type, slug: business.slug,
        currency: business.currency, agentName: business.agentName,
        configuration: business.configuration || "{}",
        modules: safeJsonParse(business.enabledModules, []),
        sectorCategory: business.sectorCategory, sectorSubtype: business.sectorSubtype,
        widgets, learnings: [], productFields: [], allSectors: [], paymentInfo: "",
      },
      kpis: { todayRevenue: 0, yesterdayRevenue: 0, revenueDeltaPct: 0, todayOrderCount: 0, pendingOrders: 0, customerCount: 0, newCustomersToday: 0, avgResponseSec: 0, totalProducts: 0, lowStockCount: 0, openConversations: 0 },
      series: [], channelBreakdown: [], statusBreakdown: [], topProducts: [], lowStock: [],
      products: [], activity: [], alerts: [], insights: [], automations: [], integrations: [], conversations: [],
      error: "Dashboard data could not be fully loaded. Please refresh to try again.",
    });
  }
}
