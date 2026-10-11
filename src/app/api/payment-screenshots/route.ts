/**
 * GET /api/payment-screenshots
 *
 * Returns all payment screenshots for the authenticated business.
 * Owner can review them anytime.
 *
 * POST /api/payment-screenshots
 *   { screenshotId, action: "verify" | "reject" }
 *   Manually verify or reject a screenshot.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDatabase } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureDatabase();

    // Ensure PaymentScreenshot table exists
    try {
      await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "PaymentScreenshot" ("id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "orderId" TEXT, "orderCode" TEXT, "customerName" TEXT, "customerPhone" TEXT, "imageData" TEXT NOT NULL, "vlmAnalysis" TEXT, "vlmVerified" BOOLEAN NOT NULL DEFAULT false, "verified" BOOLEAN NOT NULL DEFAULT false, "amount" DOUBLE PRECISION, "status" TEXT NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PaymentScreenshot_pkey" PRIMARY KEY ("id"))`);
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PaymentScreenshot_businessId_status_idx" ON "PaymentScreenshot"("businessId", "status")`);
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PaymentScreenshot_businessId_createdAt_idx" ON "PaymentScreenshot"("businessId", "createdAt")`);
    } catch {}

    const screenshots = await db.paymentScreenshot.findMany({
      where: { businessId: session.user.businessId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      screenshots: screenshots.map((s) => ({
        id: s.id,
        orderCode: s.orderCode,
        orderId: s.orderId,
        customerName: s.customerName,
        customerPhone: s.customerPhone,
        vlmVerified: s.vlmVerified,
        verified: s.verified,
        amount: s.amount,
        status: s.status,
        vlmAnalysis: s.vlmAnalysis,
        createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
        // Don't return the full imageData (base64) in the list — only return it when viewing a specific screenshot
        hasImage: !!s.imageData,
      })),
    });
  } catch (e: any) {
    console.error("[payment-screenshots] GET error:", e?.message);
    return NextResponse.json({ error: "Failed to load screenshots" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureDatabase();
    const body = await req.json();
    const { screenshotId, action } = body;

    if (!screenshotId || !action) {
      return NextResponse.json({ error: "Missing screenshotId or action" }, { status: 400 });
    }

    const status = action === "verify" ? "VERIFIED" : "REJECTED";

    const updated = await db.paymentScreenshot.update({
      where: { id: screenshotId },
      data: {
        status,
        verified: action === "verify",
      },
    });

    // If verifying, also mark the linked order as CONFIRMED
    if (action === "verify" && updated.orderId) {
      try {
        await db.order.update({
          where: { id: updated.orderId },
          data: { status: "CONFIRMED" },
        });
      } catch {}
    }

    return NextResponse.json({ ok: true, status });
  } catch (e: any) {
    console.error("[payment-screenshots] POST error:", e?.message);
    return NextResponse.json({ error: "Failed to update screenshot" }, { status: 500 });
  }
}
