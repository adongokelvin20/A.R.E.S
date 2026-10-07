import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDatabase } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await ensureDatabase();
    const businessId = session.user.businessId;
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find orders with delivery/pickup times approaching (within the next hour)
    const upcomingOrders = await db.order.findMany({
      where: {
        businessId,
        status: { in: ["PENDING", "CONFIRMED"] },
        OR: [{ deliveryTime: { not: null } }],
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const reminders = upcomingOrders
      .filter((o) => {
        if (!o.deliveryTime) return false;
        // Try to parse the delivery time — it could be a relative string like "Tomorrow at 5pm"
        const lower = o.deliveryTime.toLowerCase();
        // Check if it contains "today" or "tomorrow" or a time
        if (lower.includes("today") || lower.includes("now") || lower.includes("minute") || lower.includes("hour")) {
          return true; // likely approaching soon
        }
        if (lower.includes("tomorrow") || lower.includes("next week") || lower.includes("monday") || lower.includes("tuesday") || lower.includes("wednesday") || lower.includes("thursday") || lower.includes("friday") || lower.includes("saturday") || lower.includes("sunday")) {
          return false; // not urgent
        }
        // If it's a date string, try to parse it
        try {
          const parsed = new Date(o.deliveryTime);
          if (!isNaN(parsed.getTime())) {
            return parsed <= oneHourFromNow && parsed >= now;
          }
        } catch {}
        return false;
      })
      .map((o) => ({
        orderId: o.id,
        orderCode: (o.notes ?? "").replace("Order code: ", "").replace(/[\[\]]/g, "").trim(),
        customerName: o.customerName || "Customer",
        deliveryTime: o.deliveryTime,
        items: o.items.map((i) => `${i.quantity}x ${i.name}`).join(", "),
        total: o.total,
        status: o.status,
        urgency: "soon" as const,
      }));

    // Also get pending orders count as a general reminder
    const pendingCount = await db.order.count({ where: { businessId, status: "PENDING" } });

    return NextResponse.json({ reminders, pendingCount });
  } catch (e: any) {
    console.error("[reminders] error:", e?.message);
    return NextResponse.json({ reminders: [], pendingCount: 0 });
  }
}
