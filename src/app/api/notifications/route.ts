/**
 * GET /api/notifications
 * Returns recent notifications (new orders, low stock, etc.) for the business.
 * The frontend polls this every 30 seconds and shows a toast when there's something new.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = session.user.businessId;

  // Get recent orders from the last 5 minutes that are still "PENDING"
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recentOrders = await db.order.findMany({
    where: {
      businessId,
      createdAt: { gte: fiveMinutesAgo },
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, customerName: true, total: true, currency: true, createdAt: true },
  });

  // Get low stock products
  const products = await db.product.findMany({
    where: { businessId, status: "ACTIVE" },
    select: { id: true, name: true, stock: true, lowStockThreshold: true },
  });
  const lowStock = products.filter(p => p.stock <= p.lowStockThreshold);

  const notifications: { type: string; title: string; message: string; timestamp: string }[] = [];

  for (const order of recentOrders) {
    notifications.push({
      type: "NEW_ORDER",
      title: "New order received",
      message: `${order.customerName || "A customer"} placed an order for ${order.currency === "GHS" ? "GH₵" : order.currency} ${order.total.toFixed(2)}`,
      timestamp: order.createdAt.toISOString(),
    });
  }

  if (lowStock.length > 0) {
    notifications.push({
      type: "LOW_STOCK",
      title: "Low stock alert",
      message: `${lowStock.length} product${lowStock.length === 1 ? "" : "s"} running low: ${lowStock.slice(0, 3).map(p => p.name).join(", ")}`,
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json({ notifications });
}
