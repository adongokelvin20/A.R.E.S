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
 * Check and archive ALL missed weeks since the business was created.
 * Called when the dashboard loads. Loops through every week from the
 * business creation date to the current week, and archives any that
 * haven't been archived yet.
 */
export async function checkAndArchiveWeek(businessId: string) {
  if (!db) return;
  try {
    // Get the business creation date
    const business = await db.business.findUnique({
      where: { id: businessId },
      select: { createdAt: true },
    });
    if (!business) return;

    // Get all existing archives for this business
    const existing = await db.weeklyArchive.findMany({
      where: { businessId },
      select: { weekStart: true },
    });
    const existingSet = new Set(existing.map((a) => a.weekStart.getTime()));

    // Loop from the business creation week to last week
    const thisWeekStart = getWeekStart(new Date());
    const creationWeekStart = getWeekStart(business.createdAt);

    // Limit to last 52 weeks to avoid infinite loops
    let weekStart = creationWeekStart;
    let count = 0;
    while (weekStart < thisWeekStart && count < 52) {
      if (!existingSet.has(weekStart.getTime())) {
        // This week hasn't been archived — archive it
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
        await archiveWeek(businessId, weekStart, weekEnd);
      }
      // Move to next week
      weekStart = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      count++;
    }
  } catch (e) {
    console.error("[weekly archive] failed:", e);
  }
}

/**
 * Archive a single week's data.
 */
async function archiveWeek(businessId: string, weekStart: Date, weekEnd: Date) {
  try {
    // Gather this week's orders
    const orders = await db.order.findMany({
      where: {
        businessId,
        createdAt: { gte: weekStart, lte: weekEnd },
      },
      include: { items: true },
    });

    const validOrders = orders.filter((o) => o.status !== "CANCELLED");
    const revenue = validOrders.reduce((s, o) => s + o.total, 0);
    const orderCount = orders.length;

    // New customers that week
    const newCustomers = await db.customer.count({
      where: { businessId, createdAt: { gte: weekStart, lte: weekEnd } },
    });

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
        weekStart,
        weekEnd,
        revenue,
        orderCount,
        customerCount: totalCustomers,
        newCustomers,
        topProducts: JSON.stringify(topProducts),
        channelBreakdown: JSON.stringify(channelMap),
        statusBreakdown: JSON.stringify(statusMap),
        summary: `Week of ${weekStart.toLocaleDateString("en", { month: "short", day: "numeric" })} — ${weekEnd.toLocaleDateString("en", { month: "short", day: "numeric" })}: ${orderCount} order${orderCount === 1 ? "" : "s"}, GHC ${revenue.toFixed(2)} revenue, ${newCustomers} new customer${newCustomers === 1 ? "" : "s"}.`,
      },
    });
    console.log(`[weekly archive] Archived week of ${weekStart.toDateString()} for business ${businessId}`);
  } catch (e) {
    console.error(`[weekly archive] failed for week ${weekStart}:`, e);
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
