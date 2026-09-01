/**
 * WhatsApp Connection Status
 *
 * GET /api/whatsapp/status
 * Returns the current WhatsApp connection status and phone number if connected.
 * Also reports QR session state so the dashboard can poll while the customer
 * scans the QR on their phone.
 *
 * This checks the WHATSAPP_META integration (official Meta Cloud API via
 * Embedded Signup). No third-party gateway.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMetaConfig } from "@/lib/meta-whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = session.user.businessId;

  const integration = await db.integration.findUnique({
    where: { businessId_type: { businessId, type: "WHATSAPP_META" } },
  });

  if (!integration) {
    return NextResponse.json({ status: "disconnected" });
  }

  const config = JSON.parse(integration.config || "{}");

  if (integration.status === "CONNECTED") {
    return NextResponse.json({
      status: "connected",
      phoneNumber: config.phoneNumber ?? null,
      verifiedName: config.verifiedName ?? null,
      connectedAt: config.connectedAt ?? null,
    });
  }

  // QR session still fresh?
  if (config.qrExpiry && config.qrExpiry > Date.now() && config.qrCode) {
    return NextResponse.json({
      status: "awaiting_scan",
      qrCode: config.qrCode,
      expiresIn: Math.floor((config.qrExpiry - Date.now()) / 1000),
    });
  }

  // QR expired
  if (config.qrExpiry && config.qrExpiry <= Date.now() && config.status === "awaiting_scan") {
    return NextResponse.json({
      status: "qr_expired",
      message: "QR code expired. Generate a new one.",
    });
  }

  const cfg = getMetaConfig();
  if (!cfg.configured) {
    return NextResponse.json({
      status: "not_configured",
      message: "Meta WhatsApp Embedded Signup isn't configured on the server yet.",
    });
  }

  return NextResponse.json({ status: "disconnected" });
}
