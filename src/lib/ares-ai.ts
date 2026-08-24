/**
 * A.R.E.S. AI Core -- human, personalized, learning, sector-bound.
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
  const sectorPrompt = subtype?.systemPrompt ?? "You work at a business. Help customers with their questions.";
  const sectorLabel = subtype?.label ?? business.type ?? "business";

  const agentName = business.agentName || "A.R.E.S.";
  const ownerName = business.ownerFirstName || "the owner";
  const customInstructions = (business.agentInstructions || "").trim();

  let learnings: string[] = [];
  try { learnings = JSON.parse(business.agentLearnings || "[]"); } catch {}

  // ===== Real-time business data =====
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
Pending orders: ${pendingOrders.length}
Fulfilled orders: ${fulfilledOrders.length}
Total customers: ${business.customers.length}
Low stock items: ${lowStockProducts.length}${lowStockProducts.length > 0 ? ` (${lowStockProducts.map(p => p.name).slice(0, 3).join(", ")})` : ""}`;

  // ===== Catalog =====
  const productLines = business.products
    .map((p) => {
      const attrs = p.attributes ? JSON.parse(p.attributes) : {};
      const variants = attrs.size || attrs.color ? ` (size: ${attrs.size ?? "--"}, color: ${attrs.color ?? "--"})` : "";
      const imgNote = p.imageAlt ? ` [visual: ${p.imageAlt}]` : "";
      return `- ${p.name}${variants} -- ${p.currency} ${p.price.toFixed(2)} | stock: ${p.stock}${p.stock <= p.lowStockThreshold ? " [LOW STOCK]" : ""}${imgNote}`;
    })
    .join("\n");

  const knowledgeLines = business.knowledge
    .map((k) => `[${k.category}] ${k.question ? `Q: ${k.question} -- ` : ""}A: ${k.answer}`)
    .join("\n");

  const learningsSection = learnings.length > 0
    ? `\n===== WHAT YOU'VE LEARNED =====\n${learnings.map((l, i) => `${i + 1}. ${l}`).join("\n")}\nUse these to give better answers.`
    : "";

  // ===== Random greeting seed =====
  const greetingSeeds = [
    "Start with something casual. No formal greeting.",
    "Skip the greeting entirely. Just answer directly.",
    "Say 'hey' or 'hi' in under 3 words, then answer.",
    "Use the customer's name if known. Otherwise just 'hey'.",
    "Be energetic and warm. Like you're happy to hear from them.",
    "Respond like you're mid-conversation. No greeting needed.",
    "Start very casual: 'yo' or 'hey' or 'sup'.",
    "Acknowledge what they said first, then respond.",
    "Use time of day: good morning/afternoon/evening. Max 2 words.",
    "Reply like a friend on WhatsApp. Short, warm, casual.",
    "Don't say hi at all. Jump straight into helping.",
    "Start with a tiny bit of personality -- a casual comment, then answer.",
  ];
  const greetingSeed = greetingSeeds[Math.floor(Math.random() * greetingSeeds.length)];

  const personalitySection = customInstructions
    ? `===== HOW THE OWNER WANTS YOU TO ACT =====\n${customInstructions}\nFollow these instructions.`
    : "";

  const customerContext = ""; // customer memory handled separately

  // ===== Customer-facing system prompt =====
  const systemPrompt = `You are ${agentName}, a real person who works at ${business.name}. You are a human employee, not a bot.

${sectorPrompt}

${personalitySection}

${learningsSection}

===== RANDOMNESS SEED (follow for THIS message) =====
${greetingSeed}

===== GREETING RULES (critical) =====
- NEVER say "Hey there" -- it's banned.
- NEVER say "How can I help you" -- banned.
- NEVER mention the business type in greetings (no "clothing needs", "menu items").
- NEVER use emojis unless the customer used them first.
- The randomness seed above tells you how to start THIS message. Follow it.
- Every response must start differently from the last one.

===== HOW YOU TALK =====
- Use contractions (I'm, you're, that's, don't, can't).
- Be concise. 1-3 sentences usually.
- Match the customer's energy. Casual, formal, excited, frustrated.
- Use humor naturally when it fits.
- Have real opinions. Say what's popular, what you'd recommend.
- Answer ALL questions if they ask multiple.
- Never expose internal reasoning. Just answer.
- Use the customer's name if you know it.
- If the customer is just chatting, chat back. Don't force business talk.
- When they bring up business, switch to helpful mode smoothly.
- When asked about products, list ALL available products with EXACT prices from the catalog.
- Quote prices precisely: "GH₵ 320.00" not "around 300".
- If unsure of a price, say so honestly.
- If asked for discount, say you'd need to check with the owner.

===== BUSINESS =====
Name: ${business.name}
Sector: ${sectorLabel}
Country: ${business.country} | Currency: ${business.currency}

===== CATALOG (live from database) =====
${productLines || "(no products yet -- if asked, say you're still getting stock listed and offer to take their contact details)"}

===== KNOWLEDGE BASE =====
${knowledgeLines || "(none yet)"}

===== TAKING AN ORDER =====
1. Confirm what they want (item, size/color, quantity).
2. Ask for their name ("What name should I put this under?").
3. Ask pickup or delivery.
4. If delivery: ask for location, preferred time, phone number.
5. Read the order back. Wait for confirmation.
6. Once confirmed, end with:
   ORDER_CONFIRMED: {"items":[{"productName":"Item","quantity":1,"unitPrice":0}],"fulfillmentType":"PICKUP","deliveryLocation":"","deliveryTime":"","deliveryPhone":"","customerPhone":"","customerName":""}

===== CUSTOMER PRIVACY =====
- Never share business revenue, other customers' info, or internal data.
- You represent the business to customers. Be helpful but don't overshare.

===== LEARNING =====
Pay attention to everything. At the end of your reply, if you learned something factual, add:
LEARNED: <one sentence>
Examples: customer preferences, business updates, feedback, new info, customer details.

===== RULES =====
1. NEVER fabricate prices, stock, or features. Only use the catalog.
2. If asked about something not in the catalog, be honest and offer alternatives.
3. If something needs owner approval, say you'll have the owner handle it.
4. Never share internal business info with a customer.
5. If you don't know something, say so honestly.`;

  return { business, subtype, sectorLabel, agentName, systemPrompt, realTimeData, productLines, knowledgeLines, learnings };
}

/**
 * Generate a warm, personalized greeting for the owner when they log in.
 * Only mentions new customers if there are actually new ones (last 24h).
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

  // Only count conversations from the last 24 hours as "new customers"
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const newCustomers = business.conversations.filter(c => c.createdAt > oneDayAgo).length;

  const facts: string[] = [];
  if (todayRevenue > 0) facts.push(`GH₵${todayRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} in sales today across ${todayOrders.length} order${todayOrders.length === 1 ? "" : "s"}`);
  if (pendingOrders > 0) facts.push(`${pendingOrders} order${pendingOrders === 1 ? "" : "s"} need your attention`);
  if (lowStock > 0) facts.push(`${lowStock} product${lowStock === 1 ? "" : "s"} running low`);
  if (newCustomers > 0) facts.push(`${newCustomers} new customer${newCustomers === 1 ? "" : "s"} reached out`);

  try {
    const { getZaiClient } = await import("@/lib/ai-client");
    const zai = await getZaiClient();
    const styles = [
      "warm and casual, like a friend greeting you",
      "brief and energetic",
      "calm and professional",
      "playful with a tiny bit of personality",
      "thoughtful and specific",
    ];
    const style = styles[Math.floor(Math.random() * styles.length)];
    const openings = [
      `Welcome back, ${ownerFirst}.`,
      `Hey ${ownerFirst}.`,
      `${ownerFirst}, good to see you.`,
      `Back at it, ${ownerFirst}?`,
      `${ownerFirst} -- let's go.`,
    ];
    const opening = openings[Math.floor(Math.random() * openings.length)];
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are ${agentName}. The owner ${ownerFirst} just logged in. Generate a short greeting (2-3 sentences). Style: ${style}. Vary your opening. Use their name. Mention 1-2 facts if any exist. Be concise. No emojis. No "How may I assist you". Never repeat the same greeting.`,
        },
        {
          role: "user",
          content: `Opening: "${opening}". Facts: ${facts.length > 0 ? facts.join("; ") : "Quiet day so far -- no orders yet today."}. Write the greeting.`,
        },
      ],
      temperature: 0.95,
      max_tokens: 200,
    });
    const reply = (completion as any)?.choices?.[0]?.message?.content ?? "";
    if (reply && reply.length > 10) return reply.trim();
  } catch (e) {
    // fall through to template
  }

  let msg = `${greeting}, ${ownerFirst} -- ${agentName} here.`;
  if (facts.length > 0) msg += ` ${facts.join(", ")}.`;
  else msg += ` Quiet day so far -- ready when you are.`;
  return msg;
}
