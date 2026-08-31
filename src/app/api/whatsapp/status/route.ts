/**
 * WhatsApp Connection Status
 *
 * GET /api/whatsapp/status
 * Returns the current WhatsApp connection status and phone number if connected.
 * Also checks for QR code expiry and connection updates.
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

  const integration = await db.integration.findUnique({
    where: { businessId_type: { businessId, type: "WHATSAPP_WAAPI" } },
  });

  if (!integration) {
    return NextResponse.json({ status: "not_setup" });
  }

  const config = JSON.parse(integration.config || "{}");

  // Check if QR expired
  if (config.qrExpiry && config.qrExpiry < Date.now() && config.status === "awaiting_scan") {
    return NextResponse.json({
      status: "qr_expired",
      message: "QR code expired. Generate a new one.",
    });
  }

  if (integration.status === "CONNECTED") {
    return NextResponse.json({
      status: "connected",
      phoneNumber: config.phoneNumber || null,
      connectedAt: config.connectedAt || null,
    });
  }

  if (config.status === "awaiting_scan" && config.qrCode) {
    return NextResponse.json({
      status: "awaiting_scan",
      qrCode: config.qrCode,
      expiresIn: Math.floor((config.qrExpiry - Date.now()) / 1000),
    });
  }

  return NextResponse.json({ status: "disconnected" });
}
