/**
 * Weekly Archive System
 *
 * Saves a snapshot of the week's KPIs every week so the owner can review
 * past performance. The dashboard shows "this week" data — when a new
 * week starts, the previous week's data is archived.
 *
 * The system retains ALL memory (orders, customers, conversations are
 * never deleted). The archive is just a snapshot of KPIs for quick review.
 */
import { db } from "@/lib/db";

/**
 * Get the start of the current week (Monday 00:00)
 */
function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Check if we need to archive the previous week.
 * Called when the dashboard loads. If there's no archive for the previous
 * week, create one with that week's data.
 */
export async function checkAndArchiveWeek(businessId: string) {
  if (!db) return;
  try {
    const now = new Date();
    const thisWeekStart = getWeekStart(now);
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekEnd = new Date(thisWeekStart.getTime() - 1);

    // Check if we already have an archive for last week
    const existing = await db.weeklyArchive.findFirst({
      where: { businessId, weekStart: lastWeekStart },
    });
    if (existing) return; // already archived

    // Gather last week's data
    const orders = await db.order.findMany({
      where: {
        businessId,
        createdAt: { gte: lastWeekStart, lte: lastWeekEnd },
      },
      include: { items: true },
    });

    const validOrders = orders.filter((o) => o.status !== "CANCELLED");
    const revenue = validOrders.reduce((s, o) => s + o.total, 0);
    const orderCount = orders.length;

    // Customers (new customers that week)
    const customers = await db.customer.findMany({
      where: { businessId, createdAt: { gte: lastWeekStart, lte: lastWeekEnd } },
    });
    const newCustomers = customers.length;

    const totalCustomers = await db.customer.count({ where: { businessId } });

    // Top products
    const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const o of validOrders) {
      for (const item of o.items) {
        const key = item.name;
        if (!productMap[key]) productMap[key] = { name: item.name, quantity: 0, revenue: 0 };
        productMap[key].quantity += item.quantity;
        productMap[key].revenue += item.total;
      }
    }
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Channel breakdown
    const channelMap: Record<string, number> = {};
    for (const o of orders) {
      channelMap[o.channel] = (channelMap[o.channel] || 0) + 1;
    }

    // Status breakdown
    const statusMap: Record<string, number> = {};
    for (const o of orders) {
      statusMap[o.status] = (statusMap[o.status] || 0) + 1;
    }

    // Create the archive
    await db.weeklyArchive.create({
      data: {
        businessId,
        weekStart: lastWeekStart,
        weekEnd: lastWeekEnd,
        revenue,
        orderCount,
        customerCount: totalCustomers,
        newCustomers,
        topProducts: JSON.stringify(topProducts),
        channelBreakdown: JSON.stringify(channelMap),
        statusBreakdown: JSON.stringify(statusMap),
        summary: `Week of ${lastWeekStart.toLocaleDateString("en", { month: "short", day: "numeric" })} — ${lastWeekEnd.toLocaleDateString("en", { month: "short", day: "numeric" })}: ${orderCount} orders, GHC ${revenue.toFixed(2)} revenue, ${newCustomers} new customers.`,
      },
    });
    console.log(`[weekly archive] Archived week of ${lastWeekStart.toDateString()} for business ${businessId}`);
  } catch (e) {
    console.error("[weekly archive] failed:", e);
  }
}

/**
 * Get all weekly archives for a business (for the review page).
 */
export async function getWeeklyArchives(businessId: string) {
  if (!db) return [];
  try {
    return await db.weeklyArchive.findMany({
      where: { businessId },
      orderBy: { weekStart: "desc" },
      take: 52, // last 52 weeks
    });
  } catch (e) {
    console.error("[weekly archives] failed:", e);
    return [];
  }
}

/**
 * Get "this week" data for the dashboard.
 * Returns KPIs calculated from the start of the current week to now.
 */
export async function getThisWeekData(businessId: string) {
  if (!db) return null;
  try {
    const weekStart = getWeekStart();
    const now = new Date();

    const orders = await db.order.findMany({
      where: { businessId, createdAt: { gte: weekStart, lte: now } },
      include: { items: true },
    });

    const validOrders = orders.filter((o) => o.status !== "CANCELLED");
    const revenue = validOrders.reduce((s, o) => s + o.total, 0);
    const orderCount = orders.length;

    const newCustomers = await db.customer.count({
      where: { businessId, createdAt: { gte: weekStart, lte: now } },
    });

    // Top products this week
    const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const o of validOrders) {
      for (const item of o.items) {
        const key = item.name;
        if (!productMap[key]) productMap[key] = { name: item.name, quantity: 0, revenue: 0 };
        productMap[key].quantity += item.quantity;
        productMap[key].revenue += item.total;
      }
    }
    const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    return {
      weekStart,
      revenue,
      orderCount,
      newCustomers,
      topProducts,
    };
  } catch (e) {
    console.error("[this week] failed:", e);
    return null;
  }
}
