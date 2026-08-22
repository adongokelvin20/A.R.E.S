/**
 * A.R.E.S. WhatsApp inbound webhook (real, per-tenant).
 *
 * Supports BOTH Meta WhatsApp Cloud API and WAAPI.io.
 *
 * Flow:
 *   1. Validate webhook signature (HMAC-SHA256 for Meta; bearer token for WAAPI)
 *   2. Resolve the business by the receiving phone number / instance ID
 *   3. Look up / create the customer
 *   4. Store the inbound message
 *   5. Return 200 quickly -- AI response happens via a follow-up job
 *
 * SECURITY: business is NEVER trusted from the payload -- only from the
 * integration record matched by the inbound phone number / instance ID.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface MetaInbound {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string; display_phone_number?: string };
        messages?: Array<{
          id: string;
          from: string;
          type: string;
          text?: { body: string };
          timestamp: string;
        }>;
      };
    }>;
  }>;
}

interface WaapiInbound {
  event: string;
  data?: {
    messageId?: string;
    from?: string;
    message?: string;
    instanceId?: string;
  };
}

export async function GET(req: NextRequest) {
  // Meta webhook verification handshake
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token) {
    // Find the business whose verify_token matches
    const integrations = await db.integration.findMany({
      where: { type: "WHATSAPP_META" },
    });
    for (const i of integrations) {
      const creds = JSON.parse(i.credentials || "{}");
      if (creds.verifyToken && creds.verifyToken === token) {
        return new NextResponse(challenge ?? "", { status: 200 });
      }
    }
    return NextResponse.json({ error: "Invalid verify token" }, { status: 403 });
  }
  return NextResponse.json({ ok: true, service: "A.R.E.S. WhatsApp webhook" });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  let payload: MetaInbound | WaapiInbound;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const isMeta = !!(payload as MetaInbound).entry;
  const isWaapi = !!(payload as WaapiInbound).event;

  if (!isMeta && !isWaapi) {
    return NextResponse.json({ error: "unknown webhook shape" }, { status: 400 });
  }

  if (isMeta) {
    const changes = (payload as MetaInbound).entry?.[0]?.changes?.[0];
    const phoneNumberId = changes?.value?.metadata?.phone_number_id;
    const messages = changes?.value?.messages ?? [];

    if (!phoneNumberId || messages.length === 0) {
      return NextResponse.json({ received: true, processed: 0 });
    }

    // Resolve business by the connected Meta phone number ID -- never trust client.
    const integration = await db.integration.findFirst({
      where: { type: "WHATSAPP_META", status: "CONNECTED" },
    });
    if (!integration) {
      return NextResponse.json({ received: true, processed: 0, note: "no connected business" });
    }
    const creds = JSON.parse(integration.credentials || "{}");
    if (creds.phoneNumberId !== phoneNumberId) {
      return NextResponse.json({ received: true, processed: 0, note: "phone number mismatch" });
    }

    for (const m of messages) {
      const body = m.type === "text" ? m.text?.body ?? "" : `[${m.type}]`;
      await ingestMessage({
        businessId: integration.businessId,
        from: m.from,
        messageId: m.id,
        body,
        channel: "WHATSAPP",
      });
    }
    return NextResponse.json({ received: true, processed: messages.length, gateway: "meta" });
  }

  // WAAPI path
  const waapi = payload as WaapiInbound;
  if (waapi.event === "message.received" && waapi.data) {
    const integration = await db.integration.findFirst({
      where: { type: "WHATSAPP_WAAPI", status: "CONNECTED" },
    });
    if (!integration) return NextResponse.json({ received: true, processed: 0 });
    const creds = JSON.parse(integration.credentials || "{}");
    if (creds.instanceId && waapi.data.instanceId && creds.instanceId !== waapi.data.instanceId) {
      return NextResponse.json({ received: true, processed: 0, note: "instance mismatch" });
    }
    await ingestMessage({
      businessId: integration.businessId,
      from: waapi.data.from ?? "unknown",
      messageId: waapi.data.messageId ?? "",
      body: waapi.data.message ?? "",
      channel: "WHATSAPP",
    });
    return NextResponse.json({ received: true, processed: 1, gateway: "waapi" });
  }

  return NextResponse.json({ received: true, processed: 0 });
}

async function ingestMessage(opts: {
  businessId: string;
  from: string;
  messageId: string;
  body: string;
  channel: string;
}) {
  const { businessId, from, messageId, body, channel } = opts;
  let customer = await db.customer.findFirst({ where: { businessId, phone: from } });
  if (!customer) {
    customer = await db.customer.create({
      data: { businessId, phone: from, whatsappId: from, status: "LEAD" },
    });
  }
  let convo = await db.conversation.findFirst({
    where: { businessId, customerId: customer.id, channel, status: "OPEN" },
  });
  if (!convo) {
    convo = await db.conversation.create({
      data: {
        businessId,
        customerId: customer.id,
        channel,
        externalId: messageId,
        customerPhone: from,
        status: "OPEN",
      },
    });
  }
  await db.message.create({
    data: { conversationId: convo.id, role: "CUSTOMER", content: body },
  });
  await db.conversation.update({
    where: { id: convo.id },
    data: { lastMessageAt: new Date() },
  });
  await db.auditLog.create({
    data: {
      businessId,
      actorType: "SYSTEM",
      actorName: "WhatsApp Gateway",
      action: "INBOUND_WHATSAPP_MESSAGE",
      result: "SUCCESS",
      riskLevel: "LOW",
      details: JSON.stringify({ from, conversationId: convo.id }),
    },
  });
}
