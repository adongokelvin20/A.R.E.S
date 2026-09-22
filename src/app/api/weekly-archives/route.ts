/**
 * GET /api/weekly-archives
 *
 * Returns all weekly archives for the authenticated business.
 * Also triggers the check for archiving the previous week.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDatabase } from "@/lib/db";
import { checkAndArchiveWeek, getWeeklyArchives } from "@/lib/weekly-archive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDatabase();
  const businessId = session.user.businessId;

  // Check if we need to archive the previous week (runs on dashboard load)
  await checkAndArchiveWeek(businessId);

  const archives = await getWeeklyArchives(businessId);

  return NextResponse.json({
    archives: archives.map((a) => ({
      id: a.id,
      weekStart: a.weekStart,
      weekEnd: a.weekEnd,
      revenue: a.revenue,
      orderCount: a.orderCount,
      customerCount: a.customerCount,
      newCustomers: a.newCustomers,
      topProducts: JSON.parse(a.topProducts),
      channelBreakdown: JSON.parse(a.channelBreakdown),
      statusBreakdown: JSON.parse(a.statusBreakdown),
      summary: a.summary,
    })),
  });
}
