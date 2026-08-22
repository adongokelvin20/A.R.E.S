/**
 * Kevtech orders API
 *
 * GET  /api/orders  -- list orders for the authenticated business
 * POST /api/orders  -- create an order with fulfillment type + delivery details
 *   { customerName, customerPhone, items: [{name, quantity, unitPrice}],
 *     fulfillmentType: "PICKUP"|"DELIVERY",
 *     deliveryLocation?, deliveryTime?, deliveryPhone?, notes? }
 */
import { NextRequest, NextResponse } from "next/server";
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
  const orders = await db.order.findMany({
    where: { businessId: session.user.businessId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
    take: 100,
  });
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = session.user.businessId;

  try {
    const body = await req.json();
    const {
      customerName,
      customerPhone,
      items = [],
      fulfillmentType = "PICKUP",
      deliveryLocation,
      deliveryTime,
      deliveryPhone,
      notes,
    } = body as {
      customerName?: string;
      customerPhone?: string;
      items?: { name: string; quantity?: number; unitPrice?: number }[];
      fulfillmentType?: string;
      deliveryLocation?: string;
      deliveryTime?: string;
      deliveryPhone?: string;
      notes?: string;
    };

    if (!items.length) {
      return NextResponse.json({ error: "Order must have at least one item." }, { status: 400 });
    }
    if (fulfillmentType === "DELIVERY" && (!deliveryLocation || !deliveryPhone)) {
      return NextResponse.json(
        { error: "Delivery orders require location and phone." },
        { status: 400 }
      );
    }

    const fType = fulfillmentType === "DELIVERY" ? "DELIVERY" : "PICKUP";

    // Compute total + resolve product IDs
    let total = 0;
    const itemRows: { name: string; quantity: number; unitPrice: number; total: number; productId?: string }[] = [];
    for (const it of items) {
      const qty = Math.max(1, parseInt(String(it.quantity ?? 1), 10));
      // Try to match product by name (case-insensitive on SQLite via LOWER)
      const prod = await db.product.findFirst({
        where: { businessId, name: { equals: it.name } },
      });
      const unit = Number.isFinite(it.unitPrice) ? it.unitPrice! : prod?.price ?? 0;
      const lineTotal = unit * qty;
      total += lineTotal;
      itemRows.push({
        name: it.name,
        quantity: qty,
        unitPrice: unit,
        total: lineTotal,
        productId: prod?.id,
      });
    }

    const order = await db.order.create({
      data: {
        businessId,
        customerName: customerName ?? null,
        customerPhone: customerPhone ?? null,
        status: "PENDING",
        channel: "WEB",
        total,
        currency: "GHS",
        notes: notes ?? null,
        fulfillmentType: fType,
        deliveryLocation: fType === "DELIVERY" ? deliveryLocation ?? null : null,
        deliveryTime: fType === "DELIVERY" ? deliveryTime ?? null : null,
        deliveryPhone: fType === "DELIVERY" ? deliveryPhone ?? null : null,
        items: { create: itemRows },
      },
      include: { items: true },
    });

    await db.auditLog.create({
      data: {
        businessId,
        actorType: "USER",
        actorName: session.user.name,
        action: "CREATE_ORDER",
        tool: "orders.create",
        target: order.id,
        result: "SUCCESS",
        riskLevel: "MEDIUM",
        details: JSON.stringify({ total, fulfillmentType: fType, items: itemRows.length }),
      },
    });

    return NextResponse.json({ ok: true, order });
  } catch (err: any) {
    console.error("[orders POST] error", err);
    return NextResponse.json(
      { error: "Failed to create order.", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
