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
 * conversation persists across page reloads. The AI asks for the
 * customer's name early so they're saved as a Customer record and
 * remembered when they return.
 *
 * Robust error handling: each DB step is wrapped in its own try/catch
 * so a single failure doesn't kill the entire request. The AI call has
 * a smart fallback so customers always get a reply.
 */
import { NextRequest, NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { buildBusinessContext } from "@/lib/ares-ai";
import { getZaiClient } from "@/lib/ai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ChatTurn {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(req: NextRequest) {
  // Ensure DB tables exist
  try {
    await ensureDatabase();
  } catch (e) {
    console.error("[store chat] ensureDatabase failed:", e);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

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

  // Resolve the business by slug
  let business: any = null;
  try {
    business = await db.business.findUnique({
      where: { slug },
      select: { id: true, name: true, currency: true, agentName: true },
    });
  } catch (e) {
    console.error("[store chat] business lookup failed:", e);
    return NextResponse.json({
      reply: "I'm having trouble connecting right now. Please try again in a moment.",
      conversationId: null,
      orderCreated: null,
      images: [],
    });
  }
  if (!business) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }
  const businessId = business.id;

  // Build the AI context + do the internal product lookup IN PARALLEL (saves ~1-2s)
  let systemPrompt = `You are ${business.agentName || "the assistant"}, a real person who works at ${business.name}. You are a friendly, helpful employee. Be concise, warm, and natural. Use contractions. If the customer wants to order, ask for their name first, then pickup or delivery, then their phone number. Confirm the order before logging it.`;
  let ctx: any = { agentName: business.agentName || "Assistant", sector: "business", sectorLabel: "business", business };
  let internalNotes: string | null = null;

  const [ctxResult, notesResult] = await Promise.allSettled([
    buildBusinessContext(businessId),
    performInternalLookup(businessId, message),
  ]);

  if (ctxResult.status === "fulfilled" && ctxResult.value) {
    ctx = ctxResult.value;
    systemPrompt = ctx.systemPrompt;
  } else {
    console.error("[store chat] buildBusinessContext failed:", ctxResult.status === "rejected" ? ctxResult.reason : "unknown");
  }

  if (notesResult.status === "fulfilled") {
    internalNotes = notesResult.value;
  } else {
    console.error("[store chat] internal lookup failed:", notesResult.status === "rejected" ? notesResult.reason : "unknown");
  }

  // ===== Customer recognition =====
  // Look up the customer's name from previous conversations with the same sessionId.
  // If they've chatted before, we greet them by name (returning customer).
  let returningCustomerName: string | null = null;
  if (sessionId) {
    try {
      const prevConvo = await db.conversation.findFirst({
        where: { businessId, externalId: sessionId, channel: "WEB", customerName: { not: null } },
        select: { customerName: true },
        orderBy: { lastMessageAt: "desc" },
      });
      if (prevConvo?.customerName) {
        returningCustomerName = prevConvo.customerName;
      }
    } catch (e) {
      console.error("[store chat] customer recognition failed:", e);
    }
  }

  // If we recognize the customer, add a note to the AI so it greets them by name
  if (returningCustomerName) {
    internalNotes = (internalNotes ? internalNotes + "\n\n" : "") + `INTERNAL (don't show the user directly): This is a RETURNING CUSTOMER. Their name is ${returningCustomerName}. Greet them by name naturally — "Hey ${returningCustomerName.split(" ")[0]}, good to see you again!" Don't ask for their name again; you already know it.`;
  }

  // Build the messages for the AI
  const messages: ChatTurn[] = [
    { role: "system", content: systemPrompt },
    ...(history || [])
      .filter((m) => m && m.role && m.content)
      .slice(-6)
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    ...(internalNotes ? [{ role: "system" as const, content: internalNotes }] : []),
    { role: "user", content: message },
  ];

  // Call the AI — reduced max_tokens for faster replies (400 is plenty for a chat response)
  let reply = "";
  try {
    const zai = await getZaiClient();
    const completion = await zai.chat.completions.create({
      messages,
      temperature: 0.85,
      max_tokens: 400,
    });
    reply =
      (completion as any)?.choices?.[0]?.message?.content ??
      (completion as any)?.content ??
      (completion as any)?.choices?.[0]?.text ??
      "";
  } catch (e: any) {
    console.error("[store chat] AI call failed:", e?.message ?? e);
    reply = `Hi! I'm ${ctx.agentName}. I'm having a bit of trouble right now, but I'd love to help you. What can I do for you?`;
  }

  if (!reply || !reply.trim()) {
    reply = `Hi! I'm ${ctx.agentName}. How can I help you today?`;
  }

  // Extract LEARNED facts (business-specific) and save them
  try {
    const learnedMatch = reply.match(/LEARNED:\s*(.+?)(?:\n|$)/i);
    if (learnedMatch && learnedMatch[1]) {
      const biz = await db.business.findUnique({ where: { id: businessId }, select: { agentLearnings: true } });
      const learnings: string[] = JSON.parse(biz?.agentLearnings || "[]");
      if (!learnings.includes(learnedMatch[1].trim()) && learnings.length < 100) {
        learnings.push(learnedMatch[1].trim());
        await db.business.update({ where: { id: businessId }, data: { agentLearnings: JSON.stringify(learnings) } });
      }
      reply = reply.replace(/LEARNED:\s*.+?(?:\n|$)/i, "").trim();
    }
  } catch (e) {
    console.error("[store chat] learning save failed:", e);
  }

  // Extract BRAIN_LEARNED patterns (global human-like patterns) and save to the global brain
  try {
    const brainMatch = reply.match(/BRAIN_LEARNED:\s*(.+?)(?:\n|$)/i);
    if (brainMatch && brainMatch[1]) {
      const { learnPattern } = await import("@/lib/global-brain");
      await learnPattern(brainMatch[1].trim(), "conversation");
    }
    reply = reply.replace(/BRAIN_LEARNED:\s*.+?(?:\n|$)/i, "").trim();
  } catch (e) {
    console.error("[store chat] brain learning save failed:", e);
  }

  // Detect order confirmation and create the order
  let orderCreated: any = null;
  try {
    const orderMatch = reply.match(/ORDER_CONFIRMED:?\s*(\{[\s\S]*\})/i);
    if (orderMatch) {
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
        reply += `\n\nGot it! I've logged your order — #${orderCreated.id.slice(-6).toUpperCase()}. We'll take it from here. 🎉`;
      }
    }
  } catch (e) {
    console.error("[store chat] order creation failed:", e);
    reply = reply.replace(/ORDER_CONFIRMED:?\s*\{[\s\S]*\}/i, "").trim();
  }

  // ===== Persist the conversation =====
  let conversationId: string | null = null;
  try {
    let conversation: any = null;
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
    } else if ((customerName || customerPhone) && (!conversation.customerName || !conversation.customerPhone)) {
      conversation = await db.conversation.update({
        where: { id: conversation.id },
        data: {
          customerName: customerName || conversation.customerName || null,
          customerPhone: customerPhone || conversation.customerPhone || null,
        },
      });
    }
    conversationId = conversation.id;

    // Save the customer message
    await db.message.create({
      data: { conversationId: conversation.id, role: "CUSTOMER", content: message },
    });

    // Extract customer name from the message if the customer introduces themselves
    // e.g. "Hi I'm Akosua" or "My name is John" — save it to the conversation + Customer record
    const nameMatch = message.match(/(?:my name is|i'm|i am|this is|it's|call me)\s+([a-z][a-z\s'-]{1,30})/i);
    if (nameMatch && nameMatch[1]) {
      const extractedName = nameMatch[1].trim().split(/\s+/).slice(0, 2).join(" ");
      // Update the conversation with the name
      if (!conversation.customerName) {
        await db.conversation.update({
          where: { id: conversation.id },
          data: { customerName: extractedName },
        });
      }
      // Create/update a Customer record so the owner sees them in the dashboard
      let customer = await db.customer.findFirst({ where: { businessId, name: { equals: extractedName } } });
      if (!customer && customerPhone) {
        customer = await db.customer.findFirst({ where: { businessId, phone: customerPhone } });
      }
      if (!customer) {
        customer = await db.customer.create({
          data: {
            businessId,
            name: extractedName,
            phone: customerPhone || null,
            whatsappId: customerPhone || null,
            status: "LEAD",
          },
        });
      }
    }

    // Find product images mentioned in the reply — only query products with images, limit to 50 for speed
    const allProducts = await db.product.findMany({
      where: { businessId, status: "ACTIVE", imageUrl: { not: null } },
      select: { id: true, name: true, imageUrl: true, price: true, currency: true },
      take: 50,
    });
    const mentionedImages: any[] = [];
    const replyLower = reply.toLowerCase();
    for (const p of allProducts) {
      if (p.imageUrl && p.name && replyLower.includes(p.name.toLowerCase().split(" ")[0])) {
        mentionedImages.push({ productId: p.id, name: p.name, imageUrl: p.imageUrl, price: p.price, currency: p.currency });
        if (mentionedImages.length >= 3) break;
      }
    }

    // Save the AI reply
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
      conversationId,
      orderCreated: orderCreated ? { id: orderCreated.id, total: orderCreated.total } : null,
      images: mentionedImages,
    });
  } catch (e: any) {
    console.error("[store chat] persistence failed:", e?.message ?? e);
    // Still return the reply even if persistence failed — the customer still gets an answer
    return NextResponse.json({
      reply,
      agentName: ctx.agentName,
      conversationId,
      orderCreated: orderCreated ? { id: orderCreated.id, total: orderCreated.total } : null,
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
  } else if (resolvedName && resolvedName !== "Store customer") {
    // Save by name even without phone
    let customer = await db.customer.findFirst({ where: { businessId, name: { equals: resolvedName } } });
    if (!customer) {
      customer = await db.customer.create({ data: { businessId, name: resolvedName, status: "ACTIVE" } });
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
  const products = await db.product.findMany({ where: { businessId, status: "ACTIVE" }, take: 50 });
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
