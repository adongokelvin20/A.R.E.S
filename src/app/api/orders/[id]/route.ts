/**
 * PATCH /api/orders/[id]  -- update order status (review, close, etc.)
 *   { status: "PENDING"|"CONFIRMED"|"FULFILLED"|"CANCELLED" }
 *
 * When an order moves to CONFIRMED or FULFILLED, stock is reduced for each item.
 * If it moves back or is cancelled after stock was reduced, stock is restored.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES = ["PENDING", "CONFIRMED", "FULFILLED", "CANCELLED"];
// States where stock has been "consumed"
const STOCK_REDUCE_STATES = ["CONFIRMED", "FULFILLED"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = session.user.businessId;
  const { id } = await params;
  const body = await req.json();
  const { status } = body as { status?: string };

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const order = await db.order.findFirst({
    where: { id, businessId },
    include: { items: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const wasReduced = STOCK_REDUCE_STATES.includes(order.status);
  const willReduce = STOCK_REDUCE_STATES.includes(status);

  // Update the order
  const updated = await db.order.update({
    where: { id },
    data: { status },
  });

  // Adjust stock: if moving INTO a reduced state (and wasn't before), subtract.
  // If moving OUT of a reduced state (and won't be), add back.
  if (willReduce && !wasReduced) {
    for (const item of order.items) {
      if (item.productId) {
        await db.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }
  } else if (!willReduce && wasReduced) {
    for (const item of order.items) {
      if (item.productId) {
        await db.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
  }

  await db.auditLog.create({
    data: {
      businessId,
      actorType: "USER",
      actorName: session.user.name,
      action: "UPDATE_ORDER_STATUS",
      tool: "orders.update_status",
      target: id,
      result: "SUCCESS",
      riskLevel: status === "CANCELLED" ? "MEDIUM" : "LOW",
      details: JSON.stringify({ from: order.status, to: status, stockAdjusted: willReduce !== wasReduced }),
    },
  });

  return NextResponse.json({ ok: true, order: updated });
}
