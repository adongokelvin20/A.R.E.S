/**
 * A.R.E.S. AI chat endpoint.
 *
 * POST /api/ares/chat
 *   { message, history?, conversationId? }
 *
 * The AI is bound to the authenticated business's sector + personalization.
 * - Internal lookups are stored in message.internalNotes (never shown to user)
 * - Channel is always "WEB" for dashboard chats (the bug where it showed WHATSAPP is fixed)
 * - When the AI confirms an order, the order is created in the database
 */
import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildBusinessContext } from "@/lib/ares-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatTurn {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const businessId = session.user.businessId;

    const body = await req.json();
    const { message, history = [], conversationId } = body as {
      message?: string;
      history?: ChatTurn[];
      conversationId?: string;
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const ctx = await buildBusinessContext(businessId);

    // ===== Internal lookup (hidden from the user) =====
    const internalNotes = await performInternalLookup(businessId, message);

    const messages: ChatTurn[] = [
      { role: "system", content: ctx.systemPrompt },
      ...(history || [])
        .filter((m) => m && m.role && m.content)
        .slice(-8)
        .map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      ...(internalNotes ? ([{ role: "system" as const, content: internalNotes }] as ChatTurn[]) : []),
      { role: "user", content: message },
    ];

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages,
      temperature: 0.85, // higher temp = more varied, human-like responses
      max_tokens: 700,
    });

    let reply =
      (completion as any)?.choices?.[0]?.message?.content ??
      (completion as any)?.content ??
      "Hmm, I spaced out for a second -- could you say that again?";

    // ===== Extract LEARNED facts and save them =====
    const learnedMatch = reply.match(/LEARNED:\s*(.+?)(?:\n|$)/i);
    if (learnedMatch && learnedMatch[1]) {
      const fact = learnedMatch[1].trim();
      try {
        const business = await db.business.findUnique({ where: { id: businessId }, select: { agentLearnings: true } });
        const learnings: string[] = JSON.parse(business?.agentLearnings || "[]");
        if (!learnings.includes(fact) && learnings.length < 100) {
          learnings.push(fact);
          await db.business.update({
            where: { id: businessId },
            data: { agentLearnings: JSON.stringify(learnings) },
          });
        }
      } catch (e) {
        console.error("[chat] failed to save learning", e);
      }
      // Remove the LEARNED marker from the user-visible reply
      reply = reply.replace(/LEARNED:\s*.+?(?:\n|$)/i, "").trim();
    }

    // ===== Detect order confirmation and log the order =====
    let orderCreated = null;
    // Look for ORDER_CONFIRMED marker anywhere in the reply
    const orderMatch = reply.match(/ORDER_CONFIRMED:?\s*(\{[\s\S]*\})/i);
    if (orderMatch) {
      try {
        let rawJson = orderMatch[1].trim();
        // Try to fix common JSON issues the AI produces
        // Find the last valid closing brace
        let lastBrace = rawJson.lastIndexOf("}");
        if (lastBrace > 0 && lastBrace < rawJson.length - 1) {
          rawJson = rawJson.slice(0, lastBrace + 1);
        }
        // Try parsing directly first
        let orderData;
        try {
          orderData = JSON.parse(rawJson);
        } catch {
          // If direct parse fails, try to extract individual fields with regex
          orderData = extractOrderFields(rawJson);
        }
        if (orderData && orderData.items && orderData.items.length > 0) {
          orderCreated = await createOrderFromChat(businessId, session.user.name ?? "Customer", orderData);
        }
        // Remove the ORDER_CONFIRMED marker from the reply -- the user shouldn't see it
        reply = reply.replace(/ORDER_CONFIRMED:?\s*\{[\s\S]*\}\s*$/i, "").trim();
        reply = reply.replace(/ORDER_CONFIRMED:?\s*\{[\s\S]*\}/i, "").trim();
        if (orderCreated) {
          reply += `\n\n(I've logged your order -- #${orderCreated.id.slice(-6).toUpperCase()}. The owner will see it in their dashboard.)`;
        }
      } catch (e) {
        console.error("[chat] order parse failed", e);
        // Still strip the marker even if parsing failed
        reply = reply.replace(/ORDER_CONFIRMED:?\s*\{[\s\S]*\}/i, "").trim();
      }
    }

    // ===== Persist the conversation =====
    // FIX: channel is always "WEB" for dashboard chats -- never "WHATSAPP"
    let conversation = conversationId
      ? await db.conversation.findUnique({ where: { id: conversationId } })
      : null;
    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          businessId,
          channel: "WEB",
          status: "OPEN",
          customerName: session.user.name,
        },
      });
    }
    await db.message.create({
      data: { conversationId: conversation.id, role: "CUSTOMER", content: message },
    });

    // ===== Find product images to include in the reply =====
    // If the AI mentioned a product by name and that product has an image, attach it.
    const allProducts = await db.product.findMany({
      where: { businessId, status: "ACTIVE", imageUrl: { not: null } },
      select: { id: true, name: true, imageUrl: true, imageAlt: true, price: true, currency: true },
    });
    const mentionedImages: { productId: string; name: string; imageUrl: string; price: number; currency: string }[] = [];
    const replyLower = reply.toLowerCase();
    for (const p of allProducts) {
      if (p.imageUrl && p.name && replyLower.includes(p.name.toLowerCase().split(" ")[0])) {
        mentionedImages.push({ productId: p.id, name: p.name, imageUrl: p.imageUrl, price: p.price, currency: p.currency });
        if (mentionedImages.length >= 3) break; // max 3 images
      }
    }

    await db.message.create({
      data: {
        conversationId: conversation.id,
        role: "AI",
        content: reply,
        internalNotes: internalNotes ?? null,
        metadata: JSON.stringify({
          sector: ctx.sector,
          agentName: ctx.agentName,
          orderCreated: orderCreated?.id ?? null,
          images: mentionedImages,
        }),
      },
    });
    await db.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    // ===== Audit log =====
    await db.auditLog.create({
      data: {
        businessId,
        actorType: "AI",
        actorName: ctx.agentName,
        action: orderCreated ? "CREATE_ORDER_VIA_CHAT" : "ANSWER_CUSTOMER_QUERY",
        tool: orderCreated ? "chat.create_order" : "chat.completions",
        target: orderCreated?.id,
        result: "SUCCESS",
        riskLevel: orderCreated ? "MEDIUM" : "LOW",
        details: JSON.stringify({
          length: reply.length,
          sector: ctx.sector,
          orderCreated: !!orderCreated,
        }),
      },
    });

    return NextResponse.json({
      reply,
      agentName: ctx.agentName,
      sector: ctx.business.sectorSubtype ?? ctx.business.type,
      sectorLabel: ctx.sectorLabel,
      businessName: ctx.business.name,
      conversationId: conversation.id,
      orderCreated: orderCreated ? { id: orderCreated.id, total: orderCreated.total } : null,
      images: mentionedImages,
    });
  } catch (err: any) {
    console.error("[A.R.E.S. chat] error:", err);
    return NextResponse.json(
      { error: "AI orchestration failed", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}

/**
 * Create a real order from chat confirmation.
 */
async function createOrderFromChat(businessId: string, customerName: string, data: any) {
  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) return null;

  let total = 0;
  const itemRows: { name: string; quantity: number; unitPrice: number; total: number; productId?: string }[] = [];
  for (const it of items) {
    const qty = Math.max(1, parseInt(String(it.quantity ?? 1), 10));
    const prod = it.productName
      ? await db.product.findFirst({ where: { businessId, name: { equals: String(it.productName) } } })
      : null;
    const unit = Number.isFinite(it.unitPrice) ? it.unitPrice : prod?.price ?? 0;
    const lineTotal = unit * qty;
    total += lineTotal;
    itemRows.push({
      name: it.productName || it.name || "Item",
      quantity: qty,
      unitPrice: unit,
      total: lineTotal,
      productId: prod?.id,
    });
  }

  // Create or update a customer record so we remember them
  const resolvedName = data.customerName || customerName;
  const customerPhone = data.customerPhone || data.deliveryPhone || null;
  let customerId: string | undefined;
  if (customerPhone) {
    let customer = await db.customer.findFirst({ where: { businessId, phone: customerPhone } });
    if (!customer) {
      customer = await db.customer.create({
        data: { businessId, name: resolvedName, phone: customerPhone, whatsappId: customerPhone, status: "ACTIVE" },
      });
    } else if (resolvedName && customer.name !== resolvedName) {
      customer = await db.customer.update({ where: { id: customer.id }, data: { name: resolvedName } });
    }
    customerId = customer.id;
    // Update lifetime value
    await db.customer.update({
      where: { id: customerId },
      data: { lifetimeValue: { increment: total } },
    });
  }

  return db.order.create({
    data: {
      businessId,
      customerId: customerId,
      customerName: resolvedName,
      customerPhone: customerPhone,
      status: "PENDING",
      channel: "WEB",
      total,
      currency: "GHS",
      notes: data.notes ?? "Created via AI chat",
      fulfillmentType: data.fulfillmentType === "DELIVERY" ? "DELIVERY" : "PICKUP",
      deliveryLocation: data.deliveryLocation ?? null,
      deliveryTime: data.deliveryTime ?? null,
      deliveryPhone: data.deliveryPhone ?? null,
      items: { create: itemRows },
    },
  });
}

/**
 * Fallback: extract order fields from malformed JSON using regex.
 * The AI sometimes produces slightly broken JSON, so we pull out the
 * individual pieces we need.
 */
function extractOrderFields(raw: string): any {
  const result: any = { items: [] };

  // Extract fulfillment type
  const fTypeMatch = raw.match(/"fulfillmentType"\s*:\s*"([^"]+)"/);
  if (fTypeMatch) result.fulfillmentType = fTypeMatch[1];

  // Extract delivery fields
  const locMatch = raw.match(/"deliveryLocation"\s*:\s*"([^"]*)"/);
  if (locMatch) result.deliveryLocation = locMatch[1];
  const timeMatch = raw.match(/"deliveryTime"\s*:\s*"([^"]*)"/);
  if (timeMatch) result.deliveryTime = timeMatch[1];
  const dPhoneMatch = raw.match(/"deliveryPhone"\s*:\s*"([^"]*)"/);
  if (dPhoneMatch) result.deliveryPhone = dPhoneMatch[1];
  const cPhoneMatch = raw.match(/"customerPhone"\s*:\s*"([^"]*)"/);
  if (cPhoneMatch) result.customerPhone = cPhoneMatch[1];
  const cNameMatch = raw.match(/"customerName"\s*:\s*"([^"]*)"/);
  if (cNameMatch) result.customerName = cNameMatch[1];

  // Extract product items -- find all productName + quantity + unitPrice triplets
  const itemMatches = [...raw.matchAll(/"productName"\s*:\s*"([^"]+)"/g)];
  const qtyMatches = [...raw.matchAll(/"quantity"\s*:\s*(\d+)/g)];
  const priceMatches = [...raw.matchAll(/"unitPrice"\s*:\s*([\d.]+)/g)];

  for (let i = 0; i < itemMatches.length; i++) {
    result.items.push({
      productName: itemMatches[i][1],
      quantity: qtyMatches[i] ? parseInt(qtyMatches[i][1], 10) : 1,
      unitPrice: priceMatches[i] ? parseFloat(priceMatches[i][1]) : 0,
    });
  }

  return result.items.length > 0 ? result : null;
}

/**
 * Silent product lookup -- finds catalog items whose name or description
 * contains keywords from the user's message.
 */
async function performInternalLookup(businessId: string, message: string): Promise<string | null> {
  const products = await db.product.findMany({
    where: { businessId, status: "ACTIVE" },
    take: 200,
  });
  if (products.length === 0) {
    return `INTERNAL (don't show the user): No products in the catalog yet. If they ask about products, say you're still getting stock listed and offer to take their details.`;
  }

  const msg = message.toLowerCase();
  const tokens = msg
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2)
    .filter((t) =>
      !["the", "and", "for", "you", "are", "have", "this", "that", "with", "your", "want", "need", "please", "can", "what", "how", "much", "any", "got", "see", "look"]
        .includes(t)
    );

  const matches = products.filter((p) => {
    const haystack = `${p.name} ${p.description ?? ""} ${p.category ?? ""} ${p.imageAlt ?? ""}`.toLowerCase();
    return tokens.some((t) => haystack.includes(t));
  });

  if (matches.length === 0) {
    return `INTERNAL (don't show the user): No products match the keywords in the customer's question. Be honest -- say you don't see that item and offer to take their details or suggest they ask about something else.`;
  }

  const lines = matches
    .slice(0, 6)
    .map((p) => {
      const attrs = p.attributes ? JSON.parse(p.attributes) : {};
      const variants = attrs.size || attrs.color ? ` (size: ${attrs.size ?? "--"}, color: ${attrs.color ?? "--"})` : "";
      return `• ${p.name}${variants} -- ${p.currency} ${p.price.toFixed(2)} · stock: ${p.stock}${p.stock <= p.lowStockThreshold ? " [LOW STOCK]" : ""}`;
    })
    .join("\n");

  return `INTERNAL (don't show the user -- just use this to answer naturally): These products match what the customer asked about:\n${lines}\n\nWeave the relevant ones into your response naturally. Don't list them mechanically.`;
}
