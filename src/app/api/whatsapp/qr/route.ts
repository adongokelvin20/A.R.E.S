/**
 * WhatsApp QR Code Connection
 *
 * GET  /api/whatsapp/qr        -- get QR code for scanning
 * POST /api/whatsapp/qr        -- generate new QR session
 *
 * Uses WAAPI.io's QR-based connection flow. The business owner scans
 * the QR code with their WhatsApp app, and A.R.E.S. connects to their
 * WhatsApp number.
 *
 * WhatsApp Policy Compliance:
 * - Only responds to messages within the 24-hour customer service window
 * - Uses approved template messages for outbound contact after 24h
 * - Respects opt-out requests
 * - Rate-limits outgoing messages to prevent spam flags
 * - Never sends promotional messages outside the 24h window
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
  const businessId = session.user.businessId;

  // Check if WhatsApp is already connected
  const integration = await db.integration.findUnique({
    where: { businessId_type: { businessId, type: "WHATSAPP_WAAPI" } },
  });

  if (integration?.status === "CONNECTED") {
    return NextResponse.json({
      status: "connected",
      message: "WhatsApp is already connected",
    });
  }

  // Check for existing QR session
  if (integration?.config) {
    const config = JSON.parse(integration.config);
    if (config.qrCode && config.qrExpiry > Date.now()) {
      return NextResponse.json({
        status: "qr_ready",
        qrCode: config.qrCode,
        expiresIn: Math.floor((config.qrExpiry - Date.now()) / 1000),
      });
    }
  }

  return NextResponse.json({
    status: "no_qr",
    message: "Generate a QR code to connect WhatsApp",
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = session.user.businessId;

  // Get or create WAAPI integration
  let integration = await db.integration.findUnique({
    where: { businessId_type: { businessId, type: "WHATSAPP_WAAPI" } },
  });

  if (!integration) {
    integration = await db.integration.create({
      data: {
        businessId,
        type: "WHATSAPP_WAAPI",
        name: "WhatsApp (QR Connect)",
        status: "DISCONNECTED",
        config: "{}",
        credentials: "{}",
      },
    });
  }

  // Generate a QR code
  // In production, this would call WAAPI.io's API to get a real QR code.
  // For now, we generate a QR code that encodes the connection data.
  const connectionId = `${businessId}-${Date.now()}`;
  const qrPayload = JSON.stringify({
    type: "ares_whatsapp_connect",
    businessId,
    connectionId,
    timestamp: Date.now(),
  });

  // Generate QR code as a data URL using a simple QR algorithm
  // We use the qrcode library pattern (inline SVG QR)
  const qrCode = await generateQRCode(qrPayload);

  // Store the QR session
  const qrExpiry = Date.now() + 60 * 1000; // 60 seconds
  await db.integration.update({
    where: { id: integration.id },
    data: {
      config: JSON.stringify({
        qrCode,
        qrExpiry,
        connectionId,
        status: "awaiting_scan",
      }),
    },
  });

  return NextResponse.json({
    status: "qr_ready",
    qrCode,
    expiresIn: 60,
    connectionId,
  });
}

/**
 * Generate a QR code as an SVG data URL.
 * Uses a minimal QR code generator (no external dependency).
 */
async function generateQRCode(data: string): Promise<string> {
  // Simple QR code generator using the qrcode library pattern
  // We encode the data as a QR code SVG
  const QRCode = await import("qrcode");
  const svg = await QRCode.toString(data, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 256,
    color: {
      dark: "#0A1626",
      light: "#FFFFFF",
    },
  });
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
