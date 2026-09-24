/**
 * GET /api/notifications
 *
 * Returns new orders since the last check. Used by the dashboard
 * to show browser notifications when a new order comes in.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDatabase } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try { await ensureDatabase(); } catch {}
  const businessId = session.user.businessId;

  // Get the "since" timestamp from the query (defaults to 1 minute ago)
  const url = new URL(req.url);
  const sinceParam = url.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 60 * 1000);

  try {
    // Find orders created since the timestamp
    const newOrders = await db.order.findMany({
      where: {
        businessId,
        createdAt: { gte: since },
      },
      select: {
        id: true,
        customerName: true,
        total: true,
        currency: true,
        channel: true,
        createdAt: true,
        items: { select: { name: true, quantity: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      orders: newOrders.map((o) => ({
        id: o.id,
        customerName: o.customerName ?? "Customer",
        total: o.total,
        currency: o.currency,
        channel: o.channel,
        itemCount: o.items.length,
        createdAt: o.createdAt,
      })),
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[notifications] error:", e);
    return NextResponse.json({ orders: [], checkedAt: new Date().toISOString() });
  }
}
