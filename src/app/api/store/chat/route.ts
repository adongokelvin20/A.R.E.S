/**
 * Public store chat endpoint.
 *
 * POST /api/store/chat
 *   { slug, message, sessionId, history?, customerName?, customerPhone? }
 *
 * No auth required — the business is resolved by slug (public store page).
 * Uses the SAME AI core as the dashboard chat (sector-bound, personalized,
 * order-taking, learning). Conversations are stored with channel="WEB"
 * and appear in the owner's dashboard Conversations tab.
 *
 * The sessionId is a browser-generated UUID (localStorage) so the
 * conversation persists across page reloads. The AI still asks for the
 * customer's name + phone when they want to order (existing behavior).
 */
import { NextRequest, NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { buildBusinessContext } from "@/lib/ares-ai";
import { getZaiClient } from "@/lib/ai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface ChatTurn {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    await ensureDatabase();
    const body = await req.json();
    const { slug, message, sessionId, history = [], customerName, customerPhone } = body as {
      slug?: string;
      message?: string;
      sessionId?: string;
      history?: ChatTurn[];
      customerName?: string;
      customerPhone?: string;
    };

    if (!slug || !message || typeof message !== "string") {
      return NextResponse.json({ error: "slug and message are required" }, { status: 400 });
    }

    // Resolve the business by slug (public, no auth)
    const business = await db.business.findUnique({
      where: { slug },
      select: { id: true, name: true, currency: true, agentName: true },
    });
    if (!business) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }
    const businessId = business.id;

    // Build the same AI context the dashboard uses (sector prompt, learnings, personality)
    const ctx = await buildBusinessContext(businessId);

    // Silent internal product lookup (same as dashboard chat)
    const internalNotes = await performInternalLookup(businessId, message);

    const messages: ChatTurn[] = [
      { role: "system", content: ctx.systemPrompt },
      ...(history || [])
        .filter((m) => m && m.role && m.content)
        .slice(-8)
        .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
      ...(internalNotes ? [{ role: "system" as const, content: internalNotes }] : []),
      { role: "user", content: message },
    ];

    const zai = await getZaiClient();
    const completion = await zai.chat.completions.create({
      messages,
      temperature: 0.85,
      max_tokens: 700,
    });

    let reply =
      (completion as any)?.choices?.[0]?.message?.content ??
      (completion as any)?.content ??
      null;

    if (!reply) {
      reply = "I'm having a bit of trouble right now — mind repeating that?";
    }

    // Extract LEARNED facts and save them
    const learnedMatch = reply.match(/LEARNED:\s*(.+?)(?:\n|$)/i);
    if (learnedMatch && learnedMatch[1]) {
      try {
        const biz = await db.business.findUnique({ where: { id: businessId }, select: { agentLearnings: true } });
        const learnings: string[] = JSON.parse(biz?.agentLearnings || "[]");
        if (!learnings.includes(learnedMatch[1].trim()) && learnings.length < 100) {
          learnings.push(learnedMatch[1].trim());
          await db.business.update({ where: { id: businessId }, data: { agentLearnings: JSON.stringify(learnings) } });
        }
      } catch {}
      reply = reply.replace(/LEARNED:\s*.+?(?:\n|$)/i, "").trim();
    }

    // Detect order confirmation and create the order
    let orderCreated = null;
    const orderMatch = reply.match(/ORDER_CONFIRMED:?\s*(\{[\s\S]*\})/i);
    if (orderMatch) {
      try {
        let rawJson = orderMatch[1].trim();
        let lastBrace = rawJson.lastIndexOf("}");
        if (lastBrace > 0 && lastBrace < rawJson.length - 1) rawJson = rawJson.slice(0, lastBrace + 1);
        let orderData;
        try {
          orderData = JSON.parse(rawJson);
        } catch {
          orderData = extractOrderFields(rawJson);
        }
        if (orderData && orderData.items && orderData.items.length > 0) {
          orderCreated = await createOrderFromChat(businessId, customerName || "Store customer", orderData, business.currency);
        }
        reply = reply.replace(/ORDER_CONFIRMED:?\s*\{[\s\S]*\}\s*$/i, "").trim();
        reply = reply.replace(/ORDER_CONFIRMED:?\s*\{[\s\S]*\}/i, "").trim();
        if (orderCreated) {
          reply += `\n\n(I've logged your order — #${orderCreated.id.slice(-6).toUpperCase()}. The owner will see it in their dashboard.)`;
        }
      } catch (e) {
        reply = reply.replace(/ORDER_CONFIRMED:?\s*\{[\s\S]*\}/i, "").trim();
      }
    }

    // Persist the conversation — channel=WEB, sessionId links messages across reloads
    let conversation = null;
    if (sessionId) {
      conversation = await db.conversation.findFirst({
        where: { businessId, externalId: sessionId, channel: "WEB", status: "OPEN" },
      });
    }
    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          businessId,
          channel: "WEB",
          externalId: sessionId,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          status: "OPEN",
        },
      });
    } else if ((customerName || customerPhone) && !conversation.customerName && !conversation.customerPhone) {
      conversation = await db.conversation.update({
        where: { id: conversation.id },
        data: { customerName: customerName || null, customerPhone: customerPhone || null },
      });
    }

    await db.message.create({
      data: { conversationId: conversation.id, role: "CUSTOMER", content: message },
    });

    // Find product images mentioned in the reply
    const allProducts = await db.product.findMany({
      where: { businessId, status: "ACTIVE", imageUrl: { not: null } },
      select: { id: true, name: true, imageUrl: true, price: true, currency: true },
    });
    const mentionedImages: any[] = [];
    const replyLower = reply.toLowerCase();
    for (const p of allProducts) {
      if (p.imageUrl && p.name && replyLower.includes(p.name.toLowerCase().split(" ")[0])) {
        mentionedImages.push({ productId: p.id, name: p.name, imageUrl: p.imageUrl, price: p.price, currency: p.currency });
        if (mentionedImages.length >= 3) break;
      }
    }

    await db.message.create({
      data: {
        conversationId: conversation.id,
        role: "AI",
        content: reply,
        internalNotes: internalNotes ?? null,
        metadata: JSON.stringify({ agentName: ctx.agentName, images: mentionedImages, orderCreated: orderCreated?.id ?? null }),
      },
    });
    await db.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });

    return NextResponse.json({
      reply,
      agentName: ctx.agentName,
      conversationId: conversation.id,
      orderCreated: orderCreated ? { id: orderCreated.id, total: orderCreated.total } : null,
      images: mentionedImages,
    });
  } catch (err: any) {
    console.error("[store chat] error:", err?.message ?? err);
    return NextResponse.json({
      reply: "Sorry, I'm having trouble connecting right now. Give me a moment and try again.",
      conversationId: null,
      orderCreated: null,
      images: [],
    });
  }
}

async function createOrderFromChat(businessId: string, customerName: string, data: any, currency: string) {
  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) return null;

  let total = 0;
  const itemRows: any[] = [];
  for (const it of items) {
    const qty = Math.max(1, parseInt(String(it.quantity ?? 1), 10));
    const prod = it.productName ? await db.product.findFirst({ where: { businessId, name: { equals: String(it.productName) } } }) : null;
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

  const resolvedName = data.customerName || customerName;
  const phone = data.customerPhone || data.deliveryPhone || null;
  let customerId: string | undefined;
  if (phone) {
    let customer = await db.customer.findFirst({ where: { businessId, phone } });
    if (!customer) {
      customer = await db.customer.create({ data: { businessId, name: resolvedName, phone, whatsappId: phone, status: "ACTIVE" } });
    }
    customerId = customer.id;
    await db.customer.update({ where: { id: customerId }, data: { lifetimeValue: { increment: total } } });
  }

  return db.order.create({
    data: {
      businessId,
      customerId,
      customerName: resolvedName,
      customerPhone: phone,
      status: "PENDING",
      channel: "WEB",
      total,
      currency,
      notes: data.notes ?? "Created via store chat",
      fulfillmentType: data.fulfillmentType === "DELIVERY" ? "DELIVERY" : "PICKUP",
      deliveryLocation: data.deliveryLocation ?? null,
      deliveryTime: data.deliveryTime ?? null,
      deliveryPhone: data.deliveryPhone ?? null,
      items: { create: itemRows },
    },
  });
}

function extractOrderFields(raw: string): any {
  const result: any = { items: [] };
  const fTypeMatch = raw.match(/"fulfillmentType"\s*:\s*"([^"]+)"/);
  if (fTypeMatch) result.fulfillmentType = fTypeMatch[1];
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

async function performInternalLookup(businessId: string, message: string): Promise<string | null> {
  const products = await db.product.findMany({ where: { businessId, status: "ACTIVE" }, take: 200 });
  if (products.length === 0) {
    return `INTERNAL (don't show the user): No products in the catalog yet. If they ask about products, say you're still getting stock listed and offer to take their details.`;
  }
  const msg = message.toLowerCase();
  const tokens = msg.split(/[^a-z0-9]+/).filter((t) => t.length > 2).filter((t) => !["the", "and", "for", "you", "are", "have", "this", "that", "with", "your", "want", "need", "please", "can", "what", "how", "much", "any", "got", "see", "look"].includes(t));
  const matches = products.filter((p) => {
    const haystack = `${p.name} ${p.description ?? ""} ${p.category ?? ""} ${p.imageAlt ?? ""}`.toLowerCase();
    return tokens.some((t) => haystack.includes(t));
  });
  if (matches.length === 0) return `INTERNAL (don't show the user): No products match the keywords in the customer's question. Be honest — say you don't see that item and offer to take their details or suggest they ask about something else.`;
  const lines = matches.slice(0, 6).map((p) => {
    const attrs = p.attributes ? JSON.parse(p.attributes) : {};
    const variants = attrs.size || attrs.color ? ` (size: ${attrs.size ?? "--"}, color: ${attrs.color ?? "--"})` : "";
    return `• ${p.name}${variants} — ${p.currency} ${p.price.toFixed(2)} · stock: ${p.stock}${p.stock <= p.lowStockThreshold ? " [LOW STOCK]" : ""}`;
  }).join("\n");
  return `INTERNAL (don't show the user — just use this to answer naturally): These products match what the customer asked about:\n${lines}\n\nWeave the relevant ones into your response naturally. Don't list them mechanically.`;
}
