/**
 * WhatsApp QR Code Connection — direct, no third party.
 *
 * GET  /api/whatsapp/qr   -- returns the current QR (or generates one)
 * POST /api/whatsapp/qr   -- generate a fresh QR session
 *
 * The QR encodes the OFFICIAL Meta Embedded Signup OAuth URL. When the
 * customer scans it with their phone camera, Meta's auth dialog opens on
 * their phone. They log in, pick their WhatsApp Business number, approve —
 * and Meta redirects to /api/whatsapp/meta/callback which completes the
 * connection. No WAAPI. No unofficial clients. No third party in the link.
 *
 * The businessId is carried in the OAuth `state` parameter (set when the
 * signup URL is built), so the callback knows which business to connect.
 *
 * The desktop dashboard polls /api/whatsapp/status to detect the connection.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMetaConfig, buildEmbeddedSignupUrl } from "@/lib/meta-whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function generateQrCode(data: string): Promise<string> {
  const QRCode = await import("qrcode");
  const svg = await QRCode.toString(data, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
    color: {
      dark: "#0A1626",
      light: "#FFFFFF",
    },
  });
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = session.user.businessId;
  const cfg = getMetaConfig();

  if (!cfg.configured) {
    return NextResponse.json({
      status: "not_configured",
      message: "Meta WhatsApp Embedded Signup isn't configured on the server yet.",
    });
  }

  // If WhatsApp is already connected, say so
  const integration = await db.integration.findUnique({
    where: { businessId_type: { businessId, type: "WHATSAPP_META" } },
  });
  if (integration?.status === "CONNECTED") {
    const config = JSON.parse(integration.config || "{}");
    return NextResponse.json({
      status: "connected",
      phoneNumber: config.phoneNumber ?? null,
      message: "WhatsApp is already connected.",
    });
  }

  // Return an existing QR if it's still fresh (< 5 min)
  if (integration?.config) {
    const config = JSON.parse(integration.config);
    if (config.qrCode && config.qrExpiry > Date.now()) {
      return NextResponse.json({
        status: "qr_ready",
        qrCode: config.qrCode,
        signupUrl: config.signupUrl,
        expiresIn: Math.floor((config.qrExpiry - Date.now()) / 1000),
      });
    }
  }

  // No fresh QR — caller should POST to generate one
  return NextResponse.json({
    status: "no_qr",
    message: "Generate a QR code to start the connection.",
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = session.user.businessId;
  const cfg = getMetaConfig();

  if (!cfg.configured) {
    return NextResponse.json(
      { status: "not_configured", error: "Meta WhatsApp Embedded Signup isn't configured on the server yet." },
      { status: 503 }
    );
  }

  // Build the official Meta Embedded Signup URL (redirect-based, state=businessId)
  const signupUrl = buildEmbeddedSignupUrl(businessId);
  const qrCode = await generateQrCode(signupUrl);

  // Store the QR session so GET can return it while fresh
  const qrExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes
  let integration = await db.integration.findUnique({
    where: { businessId_type: { businessId, type: "WHATSAPP_META" } },
  });
  if (!integration) {
    integration = await db.integration.create({
      data: {
        businessId,
        type: "WHATSAPP_META",
        name: "WhatsApp Cloud API (Meta)",
        status: "DISCONNECTED",
        config: JSON.stringify({ qrCode, qrExpiry, signupUrl, status: "awaiting_scan" }),
      },
    });
  } else {
    await db.integration.update({
      where: { id: integration.id },
      data: {
        config: JSON.stringify({ qrCode, qrExpiry, signupUrl, status: "awaiting_scan" }),
      },
    });
  }

  return NextResponse.json({
    status: "qr_ready",
    qrCode,
    signupUrl,
    expiresIn: 300,
  });
}
