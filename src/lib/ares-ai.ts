/**
 * A.R.E.S. AI Core
 */

import { db } from "@/lib/db";
import { findSubtype, type SectorSubtype } from "@/lib/sector-catalog";

export async function buildBusinessContext(businessId: string) {
  const business = await db.business.findUnique({
    where: { id: businessId },
    include: {
      products: { where: { status: "ACTIVE" }, take: 200, orderBy: { createdAt: "desc" } },
      knowledge: { where: { status: "ACTIVE" }, take: 80 },
      orders: { orderBy: { createdAt: "desc" }, take: 50 },
      customers: { take: 100 },
    },
  });

  if (!business) throw new Error("Business not found");

  const subtype: SectorSubtype | null = findSubtype(business.sectorCategory, business.sectorSubtype);
  const sectorPrompt = subtype?.systemPrompt ?? "You work at a business. Help customers.";
  const sectorLabel = subtype?.label ?? business.type ?? "business";

  const agentName = business.agentName || "A.R.E.S.";
  const ownerName = business.ownerFirstName || "the owner";
  const customInstructions = (business.agentInstructions || "").trim();

  let learnings: string[] = [];
  try { learnings = JSON.parse(business.agentLearnings || "[]"); } catch {}

  // Real-time data
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfWeek = new Date(startOfToday.getTime() - 7 * 86400000);
  const todayOrders = business.orders.filter((o) => o.createdAt >= startOfToday);
  const yesterdayOrders = business.orders.filter((o) => o.createdAt >= startOfYesterday && o.createdAt < startOfToday);
  const weekOrders = business.orders.filter((o) => o.createdAt >= startOfWeek);
  const todayRevenue = todayOrders.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.total, 0);
  const weekRevenue = weekOrders.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.total, 0);
  const pendingOrders = business.orders.filter((o) => o.status === "PENDING" || o.status === "CONFIRMED");
  const fulfilledOrders = business.orders.filter((o) => o.status === "FULFILLED");
  const lowStockProducts = business.products.filter((p) => p.stock <= p.lowStockThreshold);

  const realTimeData = `Today: ${todayOrders.length} orders, ${business.currency} ${todayRevenue.toFixed(2)} revenue
Yesterday: ${yesterdayOrders.length} orders
This week: ${weekOrders.length} orders, ${business.currency} ${weekRevenue.toFixed(2)} revenue
Pending: ${pendingOrders.length}, Fulfilled: ${fulfilledOrders.length}
Total customers: ${business.customers.length}
Low stock: ${lowStockProducts.length}${lowStockProducts.length > 0 ? ` (${lowStockProducts.map(p => p.name).slice(0, 3).join(", ")})` : ""}`;

  // Catalog
  const productLines = business.products
    .map((p) => {
      const attrs = p.attributes ? JSON.parse(p.attributes) : {};
      const variants = attrs.size || attrs.color ? ` (size: ${attrs.size ?? "--"}, color: ${attrs.color ?? "--"})` : "";
      return `- ${p.name}${variants} -- ${p.currency} ${p.price.toFixed(2)} | stock: ${p.stock}${p.stock <= p.lowStockThreshold ? " [LOW]" : ""}`;
    })
    .join("\n");

  const knowledgeLines = business.knowledge
    .map((k) => `[${k.category}] ${k.question ? `Q: ${k.question} -- ` : ""}A: ${k.answer}`)
    .join("\n");

  const learningsSection = learnings.length > 0
    ? `\nLEARNINGS:\n${learnings.map((l, i) => `${i + 1}. ${l}`).join("\n")}\n`
    : "";

  // Random greeting seed
  const seeds = [
    "Start casual. No formal greeting.",
    "Skip greeting. Answer directly.",
    "Say 'hey' briefly, then answer.",
    "Use customer's name if known, otherwise 'hey'.",
    "Be warm and energetic.",
    "Mid-conversation style. No greeting.",
    "Very casual: 'yo' or 'hey'.",
    "Acknowledge what they said, then respond.",
    "Time of day greeting, max 2 words.",
    "Friend on WhatsApp style. Short, casual.",
    "No greeting. Just help.",
    "Small personality comment, then answer.",
  ];
  const seed = seeds[Math.floor(Math.random() * seeds.length)];

  const personalitySection = customInstructions
    ? `\nOWNER INSTRUCTIONS:\n${customInstructions}\n`
    : "";

  const systemPrompt = `You are ${agentName}. You work at ${business.name}. You are a human, not a bot.

${sectorPrompt}
${personalitySection}

START THIS REPLY LIKE THIS: ${seed}

RULES:
- BANNED phrases: "Hey there", "How can I help you", "How may I assist", "Certainly", "Of course", "I'd be happy to help", "Feel free to ask", "Let me know if you need anything"
- BANNED: mentioning business type in greetings (no "clothing needs", "menu items")
- BANNED: emojis (unless customer used them first)
- BANNED: exposing internal reasoning ("based on the catalog", "let me check")
- Use contractions: I'm, you're, don't, can't, won't
- 1-3 sentences usually. Be concise.
- Match the customer's energy. If they're casual, be casual. If formal, be formal.
- Have opinions. If something's popular, say so.
- Answer ALL questions if they ask multiple.
- Use customer's name if you know it.
- If customer is just chatting, chat back naturally. Don't force business talk.
- Only talk about products/business when the customer brings it up.

PRICES (critical):
- Quote EXACT prices from the catalog below. "GHS 320.00" not "around 300".
- If unsure of a price, say so. Don't guess.
- If asked for discount, say you'll check with the owner.
- NEVER make up products, prices, or information. Only use what's in the catalog.
- If asked about something not in the catalog, be honest: "I don't think we have that. Let me check what we do have..."

PRODUCTS:
${productLines || "(no products yet -- if asked, say you're still getting stock listed)"}

KNOWLEDGE:
${knowledgeLines || "(none)"}
${learningsSection}
ORDER FLOW:
1. Confirm item, size/color, quantity
2. Ask their name: "What name should I put this under?"
3. Ask pickup or delivery
4. If delivery: ask location, time, phone
5. Read order back. Wait for "yes"
6. End with: ORDER_CONFIRMED: {"items":[{"productName":"Item","quantity":1,"unitPrice":0}],"fulfillmentType":"PICKUP","deliveryLocation":"","deliveryTime":"","deliveryPhone":"","customerPhone":"","customerName":""}

PRIVACY: Never share revenue, other customers' info, or internal data with customers.

LEARNING: If you learn something factual, end with: LEARNED: <one sentence>

FLAGGING (important):
If a customer says something the owner should know about, end with: FLAG_FOR_OWNER: <one sentence>
Examples of things to flag:
- Customer is unhappy or complaining
- Customer wants a refund
- Customer is asking about something you can't help with (needs human)
- Customer has a special request
- Customer mentions a competitor
- Customer asks to speak to a manager/owner
The customer never sees this flag. It's for the owner only.
Examples: customer preferences, business updates, feedback, customer details.

BUSINESS: ${business.name} | ${sectorLabel} | ${business.country} | ${business.currency}`;

  return { business, subtype, sectorLabel, agentName, systemPrompt, realTimeData, productLines, knowledgeLines, learnings };
}

/**
 * Owner greeting -- only mentions new customers from last 24h.
 */
export async function generateOwnerGreeting(businessId: string): Promise<string> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    include: {
      products: { where: { status: "ACTIVE" }, take: 50 },
      orders: { orderBy: { createdAt: "desc" }, take: 50 },
      conversations: { where: { status: "OPEN" }, take: 10, select: { id: true, createdAt: true, customerName: true } },
    },
  });
  if (!business) return "Welcome back.";

  const agentName = business.agentName || "A.R.E.S.";
  const ownerFirst = business.ownerFirstName || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayOrders = business.orders.filter((o) => o.createdAt >= todayStart);
  const todayRevenue = todayOrders.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.total, 0);
  const pendingOrders = business.orders.filter((o) => o.status === "PENDING" || o.status === "CONFIRMED").length;
  const lowStock = business.products.filter((p) => p.stock <= p.lowStockThreshold).length;

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const newCustomers = business.conversations.filter(c => c.createdAt > oneDayAgo).length;

  const facts: string[] = [];
  if (todayRevenue > 0) facts.push(`GHS${todayRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} in sales today across ${todayOrders.length} order${todayOrders.length === 1 ? "" : "s"}`);
  if (pendingOrders > 0) facts.push(`${pendingOrders} order${pendingOrders === 1 ? "" : "s"} need attention`);
  if (lowStock > 0) facts.push(`${lowStock} product${lowStock === 1 ? "" : "s"} running low`);
  if (newCustomers > 0) facts.push(`${newCustomers} new customer${newCustomers === 1 ? "" : "s"} reached out`);

  try {
    const { getZaiClient } = await import("@/lib/ai-client");
    const zai = await getZaiClient();
    const styles = ["warm and casual", "brief and energetic", "calm and professional", "playful", "thoughtful"];
    const style = styles[Math.floor(Math.random() * styles.length)];
    const openings = [`Welcome back, ${ownerFirst}.`, `Hey ${ownerFirst}.`, `${ownerFirst}, good to see you.`, `Back at it, ${ownerFirst}?`];
    const opening = openings[Math.floor(Math.random() * openings.length)];
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: `You are ${agentName}. Owner ${ownerFirst} logged in. Short greeting (2-3 sentences). Style: ${style}. Vary opening. Use their name. Mention 1-2 facts. No emojis. No "How may I assist".` },
        { role: "user", content: `Opening: "${opening}". Facts: ${facts.length > 0 ? facts.join("; ") : "Quiet day so far."}.` },
      ],
      temperature: 0.95,
      max_tokens: 200,
    });
    const reply = (completion as any)?.choices?.[0]?.message?.content ?? "";
    if (reply && reply.length > 10) return reply.trim();
  } catch {}

  let msg = `${greeting}, ${ownerFirst} -- ${agentName} here.`;
  if (facts.length > 0) msg += ` ${facts.join(", ")}.`;
  else msg += ` Quiet day so far.`;
  return msg;
}
