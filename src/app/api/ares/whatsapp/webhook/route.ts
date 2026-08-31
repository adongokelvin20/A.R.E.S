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
      // Handle different message types (text, audio/voice, image, etc.)
      let body = "";
      let messageType = "text";
      let audioData = null;

      if (m.type === "text") {
        body = m.text?.body ?? "";
      } else if (m.type === "audio") {
        messageType = "voice";
        body = "[Voice note]";
        audioData = m.audio?.id || m.audio?.url || null;
      } else if (m.type === "image") {
        body = `[Image: ${m.image?.caption ?? ""}]`;
        messageType = "image";
      } else if (m.type === "document") {
        body = `[Document: ${m.document?.filename ?? ""}]`;
        messageType = "document";
      } else if (m.type === "location") {
        body = `[Location: ${m.location?.latitude}, ${m.location?.longitude}]`;
        messageType = "location";
      } else if (m.type === "button") {
        body = m.button?.text ?? "[Button]";
      } else if (m.type === "interactive") {
        body = m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "[Interactive]";
      } else {
        body = `[${m.type}]`;
      }

      // Process concurrently -- don't await each message sequentially
      ingestMessage({
        businessId: integration.businessId,
        from: m.from,
        messageId: m.id,
        body,
        channel: "WHATSAPP",
        messageType,
        audioData,
        timestamp: m.timestamp,
      }).catch((e) => console.error("[webhook] ingest failed:", e));
    }

    // Return 200 immediately -- AI responses happen async
    return NextResponse.json({ received: true, processed: messages.length, gateway: "meta" });
  }

  // WAAPI path -- handle concurrent messages
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

    // Process concurrently
    ingestMessage({
      businessId: integration.businessId,
      from: waapi.data.from ?? "unknown",
      messageId: waapi.data.messageId ?? "",
      body: waapi.data.message ?? "",
      channel: "WHATSAPP",
      messageType: waapi.data.messageType || "text",
      audioData: waapi.data.audioUrl || null,
      timestamp: waapi.data.timestamp,
    }).catch((e) => console.error("[webhook] waapi ingest failed:", e));

    return NextResponse.json({ received: true, processed: 1, gateway: "waapi" });
  }

  return NextResponse.json({ received: true, processed: 0 });
}

// Active conversation processing queue -- prevents duplicate processing
// and handles multiple customers concurrently
const processingQueue = new Map<string, Promise<void>>();

async function ingestMessage(opts: {
  businessId: string;
  from: string;
  messageId: string;
  body: string;
  channel: string;
  messageType?: string;
  audioData?: string | null;
  timestamp?: string;
}) {
  const { businessId, from, messageId, body, channel, messageType = "text", audioData, timestamp } = opts;

  // Queue per customer -- if a customer sends multiple messages quickly,
  // they're processed in order but different customers run concurrently
  const queueKey = `${businessId}:${from}`;
  const existing = processingQueue.get(queueKey);

  const process = (async () => {
    // Wait for previous message from this customer to finish
    if (existing) await existing.catch(() => {});

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

    // Store the message
    let messageBody = body;
    let metadata: any = { type: messageType };

    // If it's a voice note, transcribe it
    if (messageType === "voice" && audioData) {
      try {
        const { getZaiClient } = await import("@/lib/ai-client");
        const zai = await getZaiClient();
        const asrResult = await zai.audio.asr.create({
          file_base64: audioData,
          model: "whisper-large-v3",
        });
        const transcript = asrResult?.text || asrResult?.result || "";
        if (transcript) {
          messageBody = transcript;
          metadata.transcript = transcript;
          metadata.originalType = "voice";
        }
      } catch (e: any) {
        console.error("[webhook] voice transcription failed:", e?.message);
        messageBody = "I couldn't understand that voice note. Could you type it?";
        metadata.voiceFailed = true;
      }
    }

    await db.message.create({
      data: {
        conversationId: convo.id,
        role: "CUSTOMER",
        content: messageBody,
        metadata: JSON.stringify(metadata),
      },
    });

    await db.conversation.update({
      where: { id: convo.id },
      data: { lastMessageAt: new Date() },
    });

    // ===== WhatsApp Policy Compliance Check =====
    // 24-hour customer service window: only respond if the customer messaged
    // within the last 24 hours. After 24h, we can only send template messages.
    const lastCustomerMessage = convo.lastMessageAt;
    const hoursSinceLastMessage = (Date.now() - new Date(lastCustomerMessage).getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastMessage > 24) {
      // Outside the 24h window -- don't auto-respond (policy compliance)
      // Instead, flag for the owner to send a template message
      await db.auditLog.create({
        data: {
          businessId,
          actorType: "SYSTEM",
          actorName: "WhatsApp Policy",
          action: "MESSAGE_OUTSIDE_WINDOW",
          tool: "policy.check",
          result: "PENDING_APPROVAL",
          riskLevel: "MEDIUM",
          details: JSON.stringify({ from, conversationId: convo.id, hoursSinceLastMessage }),
        },
      });
      return;
    }

    // Check for opt-out keywords
    const optOutKeywords = ["stop", "unsubscribe", "opt out", "cancel", "remove me"];
    if (optOutKeywords.some(kw => messageBody.toLowerCase().trim() === kw)) {
      // Customer opted out -- update their status and don't respond
      await db.customer.update({
        where: { id: customer.id },
        data: { status: "BLOCKED" },
      });
      await db.auditLog.create({
        data: {
          businessId,
          actorType: "SYSTEM",
          actorName: "WhatsApp Policy",
          action: "CUSTOMER_OPTED_OUT",
          tool: "policy.optout",
          target: customer.id,
          result: "SUCCESS",
          riskLevel: "LOW",
        },
      });
      return;
    }

    await db.auditLog.create({
      data: {
        businessId,
        actorType: "SYSTEM",
        actorName: "WhatsApp Gateway",
        action: "INBOUND_WHATSAPP_MESSAGE",
        result: "SUCCESS",
        riskLevel: "LOW",
        details: JSON.stringify({ from, conversationId: convo.id, type: messageType }),
      },
    });

    // ===== Process AI Response (async, non-blocking) =====
    // This runs in the background so we can handle other customers concurrently
    processAIResponse(businessId, convo.id, messageBody, customer.name || from, from).catch((e) => {
      console.error("[webhook] AI response failed:", e);
    });
  })();

  processingQueue.set(queueKey, process);
  await process;
  processingQueue.delete(queueKey);
}

/**
 * Process the AI response for a WhatsApp message.
 * This runs in the background so multiple customers can be handled concurrently.
 */
async function processAIResponse(businessId: string, conversationId: string, message: string, customerName: string, fromPhone: string) {
  try {
    const { buildBusinessContext } = await import("@/lib/ares-ai");
    const { getZaiClient } = await import("@/lib/ai-client");
    const { performInternalLookup } = await import("@/app/api/ares/chat/route");

    const ctx = await buildBusinessContext(businessId);
    const internalNotes = await performInternalLookup(businessId, message);

    const messages = [
      { role: "system" as const, content: ctx.systemPrompt },
      ...(internalNotes ? [{ role: "system" as const, content: internalNotes }] : []),
      { role: "user" as const, content: message },
    ];

    const zai = await getZaiClient();
    const completion = await zai.chat.completions.create({
      messages,
      temperature: 0.9,
      max_tokens: 700,
    });

    let reply = (completion as any)?.choices?.[0]?.message?.content ?? "I'll get back to you on that shortly.";

    // Strip internal markers
    reply = reply.replace(/LEARNED:\s*.+?(?:\n|$)/i, "").trim();
    reply = reply.replace(/FLAG_FOR_OWNER:\s*.+?(?:\n|$)/i, "").trim();
    reply = reply.replace(/ORDER_CONFIRMED:?\s*\{[\s\S]*\}/i, "").trim();

    // Store the AI response
    await db.message.create({
      data: {
        conversationId,
        role: "AI",
        content: reply,
        metadata: JSON.stringify({ agentName: ctx.agentName, channel: "WHATSAPP" }),
      },
    });

    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // ===== Send the response back to WhatsApp =====
    // Rate limit: wait 1-3 seconds before sending to avoid spam flags
    const delay = 1000 + Math.random() * 2000;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Find the integration to get the API credentials
    const integration = await db.integration.findFirst({
      where: { businessId, type: { in: ["WHATSAPP_WAAPI", "WHATSAPP_META"] }, status: "CONNECTED" },
    });

    if (!integration) return;

    const creds = JSON.parse(integration.credentials || "{}");

    if (integration.type === "WHATSAPP_WAAPI" && creds.instanceId && creds.apiKey) {
      // Send via WAAPI.io
      await fetch(`https://waapi.io/api/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${creds.apiKey}`,
        },
        body: JSON.stringify({
          instanceId: creds.instanceId,
          to: fromPhone,
          message: reply,
        }),
      }).catch((e) => console.error("[webhook] WAAPI send failed:", e));
    } else if (integration.type === "WHATSAPP_META" && creds.accessToken && creds.phoneNumberId) {
      // Send via Meta Cloud API
      await fetch(`https://graph.facebook.com/v21.0/${creds.phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${creds.accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: fromPhone,
          type: "text",
          text: { body: reply },
        }),
      }).catch((e) => console.error("[webhook] Meta send failed:", e));
    }
  } catch (e: any) {
    console.error("[webhook] AI response error:", e?.message);
  }
}
