/**
 * GET /api/weekly-archives
 *
 * Returns all weekly archives for the authenticated business.
 * Also triggers the check for archiving the previous week.
 * Handles errors gracefully — returns empty archives if the table doesn't exist.
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

  try {
    await ensureDatabase();
  } catch (e) {
    console.error("[weekly-archives] ensureDatabase failed:", e);
  }

  // Always ensure WeeklyArchive table exists (idempotent)
  try {
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "WeeklyArchive" ("id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "weekStart" TIMESTAMP(3) NOT NULL, "weekEnd" TIMESTAMP(3) NOT NULL, "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0, "orderCount" INTEGER NOT NULL DEFAULT 0, "customerCount" INTEGER NOT NULL DEFAULT 0, "newCustomers" INTEGER NOT NULL DEFAULT 0, "topProducts" TEXT NOT NULL DEFAULT '[]', "channelBreakdown" TEXT NOT NULL DEFAULT '{}', "statusBreakdown" TEXT NOT NULL DEFAULT '{}', "summary" TEXT NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "WeeklyArchive_pkey" PRIMARY KEY ("id"))`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "WeeklyArchive_businessId_weekStart_idx" ON "WeeklyArchive"("businessId", "weekStart")`);
  } catch {}

  const businessId = session.user.businessId;

  // Check if we need to archive the previous week (runs on dashboard load)
  try {
    await checkAndArchiveWeek(businessId);
  } catch (e) {
    console.error("[weekly-archives] checkAndArchiveWeek failed:", e);
  }

  // Get all archives
  let archives: any[] = [];
  try {
    archives = await getWeeklyArchives(businessId);
  } catch (e) {
    console.error("[weekly-archives] getWeeklyArchives failed:", e);
  }

  return NextResponse.json({
    archives: archives.map((a) => ({
      id: a.id,
      weekStart: a.weekStart instanceof Date ? a.weekStart.toISOString() : a.weekStart,
      weekEnd: a.weekEnd instanceof Date ? a.weekEnd.toISOString() : a.weekEnd,
      revenue: a.revenue || 0,
      orderCount: a.orderCount || 0,
      customerCount: a.customerCount || 0,
      newCustomers: a.newCustomers || 0,
      topProducts: JSON.parse(a.topProducts || "[]"),
      channelBreakdown: JSON.parse(a.channelBreakdown || "{}"),
      statusBreakdown: JSON.parse(a.statusBreakdown || "{}"),
      summary: a.summary || "",
    })),
  });
}
