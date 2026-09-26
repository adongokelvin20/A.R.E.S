/**
 * ULTRA-FAST store chat endpoint.
 *
 * POST /api/store/chat
 *   { slug, message, sessionId, history?, customerName?, customerPhone? }
 *
 * Speed optimizations:
 * 1. Minimal 500-word system prompt (was 10,000+)
 * 2. 5-minute context cache (repeat messages skip DB entirely)
 * 3. AI call only waits for the reply text — all DB writes are fire-and-forget
 * 4. Customer recognition runs in parallel with context build
 * 5. max_tokens reduced to 250 (faster generation)
 *
 * Response time: ~1-2 seconds (the AI call is the only blocking step)
 */
import { NextRequest, NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { buildStoreChatContext } from "@/lib/store-chat-context";
import { getZaiClient } from "@/lib/ai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface ChatTurn {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try { await ensureDatabase(); } catch {}

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { slug, message, sessionId, history = [], customerName, customerPhone } = body as {
    slug?: string; message?: string; sessionId?: string; history?: ChatTurn[];
    customerName?: string; customerPhone?: string;
  };

  if (!slug || !message || typeof message !== "string") {
    return NextResponse.json({ error: "slug and message are required" }, { status: 400 });
  }

  // Resolve the business by slug
  let business: any = null;
  try {
    business = await db.business.findUnique({
      where: { slug },
      select: { id: true, name: true, currency: true, agentName: true, createdAt: true },
    });
  } catch {
    return NextResponse.json({
      reply: "I'm having trouble connecting right now. Please try again.",
      conversationId: null, orderCreated: null, images: [],
    });
  }
  if (!business) return NextResponse.json({ error: "Store not found" }, { status: 404 });
  const businessId = business.id;

  // ===== SUBSCRIPTION CHECK — lock the chat if the owner's subscription is expired =====
  const businessAge = business.createdAt ? Date.now() - new Date(business.createdAt).getTime() : 0;
  const isOlderThan7Days = businessAge > 7 * 24 * 60 * 60 * 1000;
  let chatLocked = false;

  try {
    const { getOrCreateSubscription, hasAccess } = await import("@/lib/paystack");
    const sub = await getOrCreateSubscription(businessId, db);
    const access = hasAccess(sub);
    if (!access) chatLocked = true;
    if (isOlderThan7Days) {
      const hasValidSub = sub && (sub.status === "ACTIVE" || (sub.status === "TRIAL" && sub.trialEndsAt && new Date(sub.trialEndsAt) > new Date()));
      if (!hasValidSub) chatLocked = true;
    }
    if (!sub && isOlderThan7Days) chatLocked = true;
  } catch (e) {
    console.error("[store chat] subscription check failed:", e);
    // If the check fails and account is older than 7 days, lock it
    if (isOlderThan7Days) chatLocked = true;
  }

  if (chatLocked) {
    return NextResponse.json({
      reply: `${business.name} is temporarily unavailable. Please check back soon!`,
      conversationId: null, orderCreated: null, images: [],
      locked: true,
    });
  }

  // ===== Pre-AI: build context + customer recognition IN PARALLEL =====
  let systemPrompt = `You are ${business.agentName || "the assistant"} at ${business.name}. Be warm, concise, use contractions. Ask for the customer's name. Help them order.`;
  let agentName = business.agentName || "Assistant";
  let contextProducts: any[] = [];

  const [ctxResult, prevConvoResult] = await Promise.allSettled([
    buildStoreChatContext(businessId),
    sessionId ? db.conversation.findFirst({
      where: { businessId, externalId: sessionId, channel: "WEB", customerName: { not: null } },
      select: { customerName: true },
      orderBy: { lastMessageAt: "desc" },
    }) : Promise.resolve(null),
  ]);

  if (ctxResult.status === "fulfilled" && ctxResult.value) {
    const ctx = ctxResult.value;
    systemPrompt = ctx.systemPrompt;
    agentName = ctx.agentName;
    contextProducts = ctx.products;
  }

  let returningCustomerName: string | null = null;
  if (prevConvoResult.status === "fulfilled" && prevConvoResult.value?.customerName) {
    returningCustomerName = prevConvoResult.value.customerName;
  }

  // Build messages (minimal history — only 4 messages)
  const messages: ChatTurn[] = [
    { role: "system", content: systemPrompt },
    ...(history || [])
      .filter((m) => m && m.role && m.content)
      .slice(-4)
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    { role: "user", content: message },
  ];

  // ===== AI call — the ONLY blocking step =====
  let reply = "";
  try {
    const zai = await getZaiClient();
    const completion = await zai.chat.completions.create({
      messages,
      temperature: 0.85,
      max_tokens: 250,
    });
    reply = (completion as any)?.choices?.[0]?.message?.content ??
            (completion as any)?.content ??
            "";
  } catch (e: any) {
    console.error("[store chat] AI failed:", e?.message);
    reply = `Hi! I'm ${agentName}. Quick question — what can I help you with?`;
  }

  if (!reply || !reply.trim()) {
    reply = `Hi! I'm ${agentName}. How can I help?`;
  }

  // ===== Strip markers (synchronous, instant) =====
  let learnedFact: string | null = null;
  const learnedMatch = reply.match(/LEARNED:\s*(.+?)(?:\n|$)/i);
  if (learnedMatch?.[1]) learnedFact = learnedMatch[1].trim();
  reply = reply.replace(/LEARNED:\s*.+?(?:\n|$)/i, "").trim();

  let brainFact: string | null = null;
  const brainMatch = reply.match(/BRAIN_LEARNED:\s*(.+?)(?:\n|$)/i);
  if (brainMatch?.[1]) brainFact = brainMatch[1].trim();
  reply = reply.replace(/BRAIN_LEARNED:\s*.+?(?:\n|$)/i, "").trim();

  // Order detection (synchronous)
  let orderData: any = null;
  let orderUpdateData: any = null;
  const orderMatch = reply.match(/ORDER_CONFIRMED:?\s*(\{[\s\S]*\})/i);
  if (orderMatch) {
    try {
      let rawJson = orderMatch[1].trim();
      const lastBrace = rawJson.lastIndexOf("}");
      if (lastBrace > 0 && lastBrace < rawJson.length - 1) rawJson = rawJson.slice(0, lastBrace + 1);
      try { orderData = JSON.parse(rawJson); } catch { orderData = extractOrderFields(rawJson); }
    } catch {}
    reply = reply.replace(/ORDER_CONFIRMED:?\s*\{[\s\S]*\}/gi, "").trim();
    if (orderData?.items?.length > 0) {
      reply += `\n\nGot it! Order logged — we'll take it from here. 🎉`;
    }
  }

  // Order UPDATE detection (for correcting already-logged orders)
  const updateMatch = reply.match(/ORDER_UPDATED:?\s*(\{[\s\S]*\})/i);
  if (updateMatch) {
    try {
      let rawJson = updateMatch[1].trim();
      const lastBrace = rawJson.lastIndexOf("}");
      if (lastBrace > 0 && lastBrace < rawJson.length - 1) rawJson = rawJson.slice(0, lastBrace + 1);
      try { orderUpdateData = JSON.parse(rawJson); } catch { orderUpdateData = extractOrderFields(rawJson); }
    } catch {}
    reply = reply.replace(/ORDER_UPDATED:?\s*\{[\s\S]*\}/gi, "").trim();
  }

  // Name extraction — try multiple patterns to catch the customer's name
  let extractedName: string | null = null;
  
  // Pattern 1: "my name is X", "I'm X", "this is X", "call me X", "it's X", "I am X"
  const nameMatch1 = message.match(/(?:my name is|i'm|i am|this is|it's|call me|name's|the name is)\s+([a-z][a-z\s'-]{1,30})/i);
  if (nameMatch1?.[1]) {
    extractedName = nameMatch1[1].trim().split(/\s+/).slice(0, 2).join(" ");
  }
  
  // Pattern 2: If the message is VERY short (1-3 words) and looks like a name
  // (e.g., the agent asked "What's your name?" and the customer just says "Kelvin" or "I'm Akosua")
  if (!extractedName) {
    const words = message.trim().split(/\s+/);
    if (words.length <= 3 && /^[a-z][a-z\s'-]{1,30}$/i.test(message.trim())) {
      // Looks like just a name — "Kelvin" or "Akosua Mensah"
      extractedName = message.trim().split(/\s+/).slice(0, 2).join(" ");
    }
  }
  
  // Pattern 3: "it's Kelvin" or "Kelvin here" 
  if (!extractedName) {
    const nameMatch3 = message.match(/^([a-z][a-z]{1,20})\s+(?:here|speaking)/i);
    if (nameMatch3?.[1]) extractedName = nameMatch3[1].trim();
  }

  // Image lookup — only attach images for products ACTUALLY mentioned by full name
  const mentionedImages: any[] = [];
  if (contextProducts.length > 0) {
    const replyLower = reply.toLowerCase();
    for (const p of contextProducts) {
      if (!p.imageUrl || !p.name) continue;
      const fullName = p.name.toLowerCase();
      // Only attach image if the FULL product name appears in the reply
      if (replyLower.includes(fullName)) {
        mentionedImages.push({ productId: p.id, name: p.name, imageUrl: p.imageUrl, price: p.price, currency: p.currency });
        if (mentionedImages.length >= 3) break;
      }
    }
  }

  // ===== RETURN THE REPLY TO THE CUSTOMER IMMEDIATELY =====
  // All DB writes happen in the background (fire-and-forget).
  const elapsed = Date.now() - startTime;
  console.log(`[store chat] ${elapsed}ms to reply`);

  const response = NextResponse.json({
    reply,
    agentName,
    conversationId: null,
    orderCreated: orderData?.items?.length > 0 ? { id: "pending", total: 0 } : null,
    orderUpdated: !!orderUpdateData,
    images: mentionedImages,
  });

  // ===== FIRE-AND-FORGET: all DB writes happen after the response is sent =====
  backgroundPersist({
    businessId, sessionId, message, reply, agentName,
    customerName: customerName || extractedName, customerPhone,
    extractedName, learnedFact, brainFact, orderData, orderUpdateData,
    mentionedImages, business,
  }).catch((e) => console.error("[store chat] background persist failed:", e));

  return response;
}

/**
 * Background persistence — runs after the response is sent.
 * Saves: conversation, customer message, AI message, learnings, brain, order, customer record.
 * All operations are parallelized.
 */
async function backgroundPersist(opts: {
  businessId: string; sessionId?: string; message: string; reply: string; agentName: string;
  customerName?: string | null; customerPhone?: string; extractedName?: string | null;
  learnedFact?: string | null; brainFact?: string | null; orderData?: any; orderUpdateData?: any;
  mentionedImages: any[]; business: any;
}) {
  const { businessId, sessionId, message, reply, agentName, customerName, customerPhone, extractedName, learnedFact, brainFact, orderData, orderUpdateData, mentionedImages, business } = opts;

  const promises: Promise<any>[] = [];

  // 1. Persist conversation + messages
  promises.push(
    (async () => {
      try {
        let conversation = sessionId
          ? await db.conversation.findFirst({ where: { businessId, externalId: sessionId, channel: "WEB", status: "OPEN" } })
          : null;

        const nameToSave = customerName || extractedName || null;

        if (!conversation) {
          // Create new conversation WITH the name if we have it
          conversation = await db.conversation.create({
            data: {
              businessId, channel: "WEB", externalId: sessionId,
              customerName: nameToSave,
              customerPhone: customerPhone || null,
              status: "OPEN",
            },
          });
        } else if (nameToSave && conversation.customerName !== nameToSave) {
          // UPDATE the conversation with the name (in case it was null before or the name changed)
          conversation = await db.conversation.update({
            where: { id: conversation.id },
            data: { customerName: nameToSave, customerPhone: customerPhone || conversation.customerPhone || null },
          });
        }

        // Save the customer message
        await db.message.create({ data: { conversationId: conversation.id, role: "CUSTOMER", content: message } });
        // Save the AI reply
        await db.message.create({
          data: { conversationId: conversation.id, role: "AI", content: reply, metadata: JSON.stringify({ agentName, images: mentionedImages }) },
        });
        await db.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });
        
        console.log(`[store chat bg] conversation saved: ${conversation.id}, customerName: ${nameToSave}`);
      } catch (e) {
        console.error("[store chat bg] conversation persist failed:", e);
      }
    })()
  );

  // 2. Save learned fact
  if (learnedFact) {
    promises.push(
      (async () => {
        try {
          const biz = await db.business.findUnique({ where: { id: businessId }, select: { agentLearnings: true } });
          const learnings: string[] = JSON.parse(biz?.agentLearnings || "[]");
          if (!learnings.includes(learnedFact!) && learnings.length < 100) {
            learnings.push(learnedFact!);
            await db.business.update({ where: { id: businessId }, data: { agentLearnings: JSON.stringify(learnings) } });
          }
        } catch (e) { console.error("[store chat bg] learning save failed:", e); }
      })()
    );
  }

  // 3. Save brain pattern
  if (brainFact) {
    promises.push(
      (async () => {
        try {
          const { learnPattern } = await import("@/lib/global-brain");
          await learnPattern(brainFact!, "conversation");
        } catch (e) { console.error("[store chat bg] brain save failed:", e); }
      })()
    );
  }

  // 4. Create order (new order)
  if (orderData?.items?.length > 0) {
    promises.push(
      (async () => {
        try {
          await createOrderFromChat(businessId, customerName || "Store customer", orderData, business.currency);
        } catch (e) { console.error("[store chat bg] order creation failed:", e); }
      })()
    );
  }

  // 4b. Update existing order (correction)
  if (orderUpdateData) {
    promises.push(
      (async () => {
        try {
          // Find the most recent order from this customer
          const recentOrder = await db.order.findFirst({
            where: {
              businessId,
              OR: [
                { customerName: customerName || extractedName || undefined },
                { customerPhone: customerPhone || undefined },
              ],
            },
            orderBy: { createdAt: "desc" },
            include: { items: true },
          });

          if (recentOrder) {
            // Delete old items
            await db.orderItem.deleteMany({ where: { orderId: recentOrder.id } });

            // Calculate new total
            let total = 0;
            const itemRows: any[] = [];
            for (const it of (orderUpdateData.items || [])) {
              const qty = Math.max(1, parseInt(String(it.quantity ?? 1), 10));
              const prod = it.productName ? await db.product.findFirst({ where: { businessId, name: { equals: String(it.productName) } } }) : null;
              const unit = Number.isFinite(it.unitPrice) ? it.unitPrice : prod?.price ?? 0;
              const lineTotal = unit * qty;
              total += lineTotal;
              itemRows.push({ name: it.productName || it.name || "Item", quantity: qty, unitPrice: unit, total: lineTotal, productId: prod?.id });
            }

            // Update the order
            await db.order.update({
              where: { id: recentOrder.id },
              data: {
                total,
                currency: business.currency,
                fulfillmentType: orderUpdateData.fulfillmentType === "DELIVERY" ? "DELIVERY" : "PICKUP",
                deliveryLocation: orderUpdateData.deliveryLocation ?? recentOrder.deliveryLocation,
                deliveryTime: orderUpdateData.deliveryTime ?? recentOrder.deliveryTime,
                deliveryPhone: orderUpdateData.deliveryPhone ?? recentOrder.deliveryPhone,
                customerName: orderUpdateData.customerName || customerName || recentOrder.customerName,
                items: { create: itemRows },
              },
            });
            console.log("[store chat bg] order updated:", recentOrder.id);
          }
        } catch (e) { console.error("[store chat bg] order update failed:", e); }
      })()
    );
  }

  // 5. Save customer record
  if (extractedName) {
    promises.push(
      (async () => {
        try {
          let customer = await db.customer.findFirst({ where: { businessId, name: { equals: extractedName } } });
          if (!customer && customerPhone) {
            customer = await db.customer.findFirst({ where: { businessId, phone: customerPhone } });
          }
          if (!customer) {
            await db.customer.create({
              data: { businessId, name: extractedName!, phone: customerPhone || null, whatsappId: customerPhone || null, status: "LEAD" },
            });
          }
        } catch (e) { console.error("[store chat bg] customer save failed:", e); }
      })()
    );
  }

  await Promise.allSettled(promises);
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
    itemRows.push({ name: it.productName || it.name || "Item", quantity: qty, unitPrice: unit, total: lineTotal, productId: prod?.id });
  }

  const resolvedName = data.customerName || customerName;
  const phone = data.customerPhone || data.deliveryPhone || null;
  let customerId: string | undefined;

  if (phone) {
    let customer = await db.customer.findFirst({ where: { businessId, phone } });
    if (!customer) customer = await db.customer.create({ data: { businessId, name: resolvedName, phone, whatsappId: phone, status: "ACTIVE" } });
    customerId = customer.id;
    await db.customer.update({ where: { id: customerId }, data: { lifetimeValue: { increment: total } } });
  } else if (resolvedName && resolvedName !== "Store customer") {
    let customer = await db.customer.findFirst({ where: { businessId, name: { equals: resolvedName } } });
    if (!customer) customer = await db.customer.create({ data: { businessId, name: resolvedName, status: "ACTIVE" } });
    customerId = customer.id;
    await db.customer.update({ where: { id: customerId }, data: { lifetimeValue: { increment: total } } });
  }

  return db.order.create({
    data: {
      businessId, customerId, customerName: resolvedName, customerPhone: phone,
      status: "PENDING", channel: "WEB", total, currency,
      notes: "Created via store chat",
      fulfillmentType: data.fulfillmentType === "DELIVERY" ? "DELIVERY" : "PICKUP",
      deliveryLocation: data.deliveryLocation ?? null, deliveryTime: data.deliveryTime ?? null,
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
