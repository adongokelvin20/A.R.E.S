/**
 * A.R.E.S. integrations API
 *
 * GET  /api/integrations           -- list integrations for the business
 * POST /api/integrations           -- connect or update an integration
 *   { type, credentials: {...} }
 * DELETE /api/integrations?type=X  -- disconnect
 *
 * Credentials are stored server-side only -- never returned to the frontend.
 * The frontend only sees the status (CONNECTED/DISCONNECTED) and non-secret config.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INTEGRATION_DEFS: Record<
  string,
  {
    name: string;
    requiredFields: string[];
    // If true, this integration connects via Meta Embedded Signup (no manual fields).
    embeddedSignup?: boolean;
    // Optional: ping the gateway to verify the credentials are valid
    verify?: (creds: Record<string, string>) => Promise<{ ok: boolean; message?: string }>;
  }
> = {
  WHATSAPP_META: {
    name: "WhatsApp Cloud API (Meta)",
    requiredFields: [],
    embeddedSignup: true,
    // Verification happens through the Embedded Signup callback, not a manual form.
  },
  PAYMENT_PAYSTACK: {
    name: "Paystack",
    requiredFields: ["secretKey", "publicKey"],
    verify: async (c) => {
      try {
        const res = await fetch("https://api.paystack.co/transaction", {
          headers: { Authorization: `Bearer ${c.secretKey}` },
        });
        if (res.ok || res.status === 400) return { ok: true, message: "Paystack key accepted." };
        return { ok: false, message: "Paystack rejected the secret key." };
      } catch (e: any) {
        return { ok: false, message: String(e?.message ?? e) };
      }
    },
  },
  EMAIL_SMTP: {
    name: "Email (SMTP)",
    requiredFields: ["host", "port", "username", "password"],
  },
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = session.user.businessId;

  // Make sure all integration rows exist (one per type)
  for (const [type, def] of Object.entries(INTEGRATION_DEFS)) {
    const existing = await db.integration.findUnique({
      where: { businessId_type: { businessId, type } },
    });
    if (!existing) {
      await db.integration.create({
        data: { businessId, type, name: def.name, status: "DISCONNECTED" },
      });
    }
  }

  const integrations = await db.integration.findMany({
    where: { businessId },
    orderBy: { type: "asc" },
  });

  // Strip credentials before sending to the frontend
  const safe = integrations.map((i) => ({
    id: i.id,
    type: i.type,
    name: i.name,
    status: i.status,
    config: JSON.parse(i.config),
    requiredFields: INTEGRATION_DEFS[i.type]?.requiredFields ?? [],
    embeddedSignup: INTEGRATION_DEFS[i.type]?.embeddedSignup ?? false,
    lastSyncAt: i.lastSyncAt,
  }));

  return NextResponse.json({ integrations: safe });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = session.user.businessId;

  try {
    const body = await req.json();
    const { type, credentials } = body as {
      type?: string;
      credentials?: Record<string, string>;
    };

    if (!type || !INTEGRATION_DEFS[type]) {
      return NextResponse.json({ error: "Unknown integration type" }, { status: 400 });
    }
    const def = INTEGRATION_DEFS[type];

    // Embedded-signup integrations (WhatsApp) connect through their own OAuth
    // callback — never through manual credential POST.
    if (def.embeddedSignup) {
      return NextResponse.json(
        { error: "This integration connects via Embedded Signup. Use the Connect button." },
        { status: 400 }
      );
    }

    const creds = credentials ?? {};
    const missing = def.requiredFields.filter((f) => !creds[f]?.trim());
    if (missing.length) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify credentials against the gateway (if a verifier is defined)
    let status: "CONNECTED" | "ERROR" = "CONNECTED";
    let message = "Connected successfully.";
    if (def.verify) {
      const v = await def.verify(creds);
      if (!v.ok) {
        status = "ERROR";
        message = v.message ?? "Verification failed.";
      } else {
        message = v.message ?? message;
      }
    }

    // Upsert the integration row
    const existing = await db.integration.findUnique({
      where: { businessId_type: { businessId, type } },
    });
    let integration;
    if (existing) {
      integration = await db.integration.update({
        where: { id: existing.id },
        data: {
          status,
          credentials: JSON.stringify(creds),
          config: JSON.stringify({ verified: status === "CONNECTED", message }),
          lastSyncAt: new Date(),
        },
      });
    } else {
      integration = await db.integration.create({
        data: {
          businessId,
          type,
          name: def.name,
          status,
          credentials: JSON.stringify(creds),
          config: JSON.stringify({ verified: status === "CONNECTED", message }),
          lastSyncAt: new Date(),
        },
      });
    }

    await db.auditLog.create({
      data: {
        businessId,
        actorType: "USER",
        actorName: session.user.name,
        action: "CONNECT_INTEGRATION",
        tool: `integrations.${type}`,
        target: integration.id,
        result: status === "CONNECTED" ? "SUCCESS" : "FAILURE",
        riskLevel: "HIGH",
        details: JSON.stringify({ type, status }),
      },
    });

    return NextResponse.json({
      ok: status === "CONNECTED",
      status,
      message,
      integration: {
        id: integration.id,
        type: integration.type,
        name: integration.name,
        status: integration.status,
        config: JSON.parse(integration.config),
        requiredFields: def.requiredFields,
      },
    });
  } catch (err: any) {
    console.error("[integrations POST] error", err);
    return NextResponse.json(
      { error: "Failed to connect.", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = session.user.businessId;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });

  const existing = await db.integration.findUnique({
    where: { businessId_type: { businessId, type } },
  });
  if (existing) {
    await db.integration.update({
      where: { id: existing.id },
      data: { status: "DISCONNECTED", credentials: "{}", config: "{}", lastSyncAt: null },
    });
    await db.auditLog.create({
      data: {
        businessId,
        actorType: "USER",
        actorName: session.user.name,
        action: "DISCONNECT_INTEGRATION",
        tool: `integrations.${type}`,
        target: existing.id,
        result: "SUCCESS",
        riskLevel: "MEDIUM",
      },
    });
  }
  return NextResponse.json({ ok: true });
}
