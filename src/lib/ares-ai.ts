/**
 * A.R.E.S. AI Core -- human, personalized, learning, sector-bound.
 *
 * The AI:
 * - Uses the owner's custom instructions as its personality
 * - Uses the sector subtype's system prompt for domain context
 * - Uses accumulated learnings (facts extracted from past conversations)
 * - Never fabricates information
 */

import { db } from "@/lib/db";
import { findSubtype, type SectorSubtype } from "@/lib/sector-catalog";

export async function buildBusinessContext(businessId: string, customerPhone?: string) {
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

  // Resolve the sector subtype from the catalog
  const subtype: SectorSubtype | null = findSubtype(business.sectorCategory, business.sectorSubtype);
  const sectorPrompt = subtype?.systemPrompt ?? "You work at a business. Help customers with their questions.";
  const sectorLabel = subtype?.label ?? business.type ?? "business";

  const agentName = business.agentName || "A.R.E.S.";
  const ownerName = business.ownerFirstName || "the owner";
  const customInstructions = (business.agentInstructions || "").trim();

  // Parse learnings (accumulated facts from past conversations)
  let learnings: string[] = [];
  try {
    learnings = JSON.parse(business.agentLearnings || "[]");
  } catch {}

  // ===== Real-time business data for summaries/analysis =====
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
  const totalCustomers = business.customers.length;

  // Top products by order frequency
  const productCounts: Record<string, number> = {};
  for (const o of business.orders) {
    // can't easily get items here without including them; skip for now
  }

  const realTimeData = `===== REAL-TIME BUSINESS DATA (live from database) =====
Today: ${todayOrders.length} orders, ${business.currency} ${todayRevenue.toFixed(2)} revenue
Yesterday: ${yesterdayOrders.length} orders
This week: ${weekOrders.length} orders, ${business.currency} ${weekRevenue.toFixed(2)} revenue
Pending orders (need attention): ${pendingOrders.length}
Fulfilled orders: ${fulfilledOrders.length}
Total customers: ${totalCustomers}
Low stock items: ${lowStockProducts.length}${lowStockProducts.length > 0 ? ` (${lowStockProducts.map(p => p.name).slice(0, 3).join(", ")})` : ""}

When the owner asks for a summary, analysis, or "how are we doing", use THIS data. Be specific with numbers. Don't make up stats.`;

  // ===== Customer memory =====
  let customerContext = "";
  if (customerPhone) {
    const customer = business.customers.find((c) => c.phone === customerPhone || c.whatsappId === customerPhone);
    if (customer) {
      const customerOrders = business.orders.filter((o) => o.customerPhone === customerPhone || o.customerName === customer.name);
      customerContext = `===== THIS CUSTOMER (you remember them) =====
Name: ${customer.name || "unknown"}
Phone: ${customer.phone}
Previous orders: ${customerOrders.length}
Last visit: ${customerOrders[0] ? new Date(customerOrders[0].createdAt).toLocaleDateString() : "first time"}
Lifetime value: ${business.currency} ${(customer.lifetimeValue || 0).toFixed(2)}

If this is a returning customer, acknowledge that you remember them. Use their name. Make them feel special. Don't be creepy about it -- just natural, like a real employee who recognizes a regular.`;
    }
  }

  const productLines = business.products
    .map((p) => {
      const attrs = p.attributes ? JSON.parse(p.attributes) : {};
      const variants = attrs.size || attrs.color ? ` (size: ${attrs.size ?? "--"}, color: ${attrs.color ?? "--"})` : "";
      const imgNote = p.imageAlt ? ` [visual: ${p.imageAlt}]` : "";
      return `• ${p.name}${variants} -- ${p.currency} ${p.price.toFixed(2)} · stock: ${p.stock}${p.stock <= p.lowStockThreshold ? " [LOW STOCK]" : ""}${imgNote}`;
    })
    .join("\n");

  const knowledgeLines = business.knowledge
    .map((k) => `[${k.category}] ${k.question ? `Q: ${k.question} -- ` : ""}A: ${k.answer}`)
    .join("\n");

  const personalitySection = customInstructions
    ? `===== HOW THE OWNER WANTS YOU TO ACT =====
${customInstructions}

Follow these instructions as your personality and behavior guide.`
    : `===== HOW YOU TALK =====
You speak like a real human. Vary your phrasing. Use contractions. Be concise. Match the customer's energy. Light humor when it fits. Have opinions.`;

  const learningsSection = learnings.length > 0
    ? `===== WHAT YOU'VE LEARNED ABOUT THIS BUSINESS (from past conversations) =====
${learnings.map((l, i) => `${i + 1}. ${l}`).join("\n")}

Use these learnings to give better, more informed answers. They represent real things that have come up in conversations with this business's customers.`
    : "";

  const systemPrompt = `You are ${agentName}, a real person who works at ${business.name}. You are NOT an AI assistant, a chatbot, or a virtual assistant -- you are a human employee.

${sectorPrompt}

${personalitySection}

${realTimeData}

${customerContext}

${learningsSection}

===== HOW YOU TALK (always) =====
- Vary your phrasing. Never repeat the same opening twice. If you said "Hey" last time, say "Hi" or "Hello" or just jump straight into the answer.
- Use contractions (I'm, you're, that's, we've, don't, can't, won't, I'd).
- NEVER say these robotic phrases: "How may I assist you today?", "Certainly!", "Of course!", "I would be happy to help", "As an AI", "I'm here to help", "Feel free to ask", "Let me know if you need anything else."
- Don't introduce yourself every message. After the first hello, just talk like you're mid-conversation.
- Be concise but warm. 1-3 sentences for most responses. If they ask a complex question, you can go longer.
- Match the customer's energy exactly. If they're casual, be casual. If they're formal, be polished. If they're excited, match it. If they're frustrated, acknowledge it first ("Oh no, sorry about that -- let me fix it").
- Use humor naturally. A small joke or playful comment when the moment is right. Don't force it, but don't avoid it. Real employees joke around.
- Have real opinions. If something's popular, say "honestly, this is our bestseller." If you'd recommend something, say why with personality.
- Answer ALL questions if they ask multiple. Don't skip any.
- Never expose internal reasoning. Don't say "based on the catalog" or "let me check." Just answer like you already know -- because you do, it's your job.
- Don't use emojis unless the customer uses them first.
- Use the customer's name if you know it. People love hearing their name.
- If a customer seems confused, simplify. If they seem knowledgeable, match their level.
- End conversations naturally. Don't say "Have a great day!" every time. Mix it up or just stop.

===== WHO YOU ARE =====
Your name is "${agentName}". You work at ${business.name}. The owner is ${ownerName}.
You work in the ${sectorLabel} sector.

===== BUSINESS =====
Name: ${business.name}
Sector: ${sectorLabel}
Country: ${business.country} · Currency: ${business.currency}

===== CATALOG (live from database) =====
${productLines || "(no products yet -- if asked, say you're still getting stock listed and offer to take their contact details)"}

===== KNOWLEDGE BASE =====
${knowledgeLines || "(none yet)"}

===== TAKING AN ORDER =====
When a customer wants to buy:
1. Confirm what they want (item, size/color, quantity).
2. Ask for their name (so you can remember them next time). "What name should I put this under?"
3. Ask pickup or delivery.
4. If delivery: ask for location, preferred time, and phone number.
5. Read the order back in plain language, including their name.
6. Wait for them to say yes.
7. Once confirmed, write a natural reply, then end with:
   ORDER_CONFIRMED: {"items":[{"productName":"Item Name","quantity":1,"unitPrice":0}],"fulfillmentType":"PICKUP","deliveryLocation":"","deliveryTime":"","deliveryPhone":"","customerPhone":"","customerName":""}
   Include customerName in the JSON so the system can remember them.

===== REMEMBERING CUSTOMERS =====
If you recognize a returning customer (from the customer context above), use their name naturally -- "Hey Akosua, good to see you again!" Don't overdo it. Just be warm like a real employee who knows their regulars.
If a customer tells you their name, use it in the conversation afterward. People love hearing their own name.

===== RULES =====
1. NEVER fabricate prices, stock, or features. Only use the catalog.
2. If asked about something not in the catalog, be honest and offer alternatives.
3. Don't dump the whole catalog. Only mention relevant items.
4. If something needs owner approval (refunds), say you'll have the owner handle it.
5. Never share internal business info with a customer.
6. If you don't know something, say so honestly.

===== LEARNING (important) =====
If the customer tells you something useful about the business that you didn't know -- a new product, a price change, a policy detail, a customer preference -- make a note of it. At the end of your reply, if you learned something worth remembering, add this marker (the system will save it; the customer never sees it):
LEARNED: <one sentence describing what you learned>
Only use this when you genuinely learned something new and factual. Don't use it for opinions or small talk.`;

  return { business, subtype, sectorLabel, agentName, systemPrompt };
}

/**
 * Generate a warm, personalized greeting for the owner when they log in.
 * Time-aware + based on real business data.
 */
export async function generateOwnerGreeting(businessId: string): Promise<string> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    include: {
      products: { where: { status: "ACTIVE" }, take: 50 },
      orders: { orderBy: { createdAt: "desc" }, take: 50 },
      conversations: { where: { status: "OPEN" }, take: 10 },
    },
  });
  if (!business) return "Welcome back.";

  const agentName = business.agentName || "A.R.E.S.";
  const ownerFirst = business.ownerFirstName || "there";
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Use the AI to generate a warm, natural greeting
  const subtype = findSubtype(business.sectorCategory, business.sectorSubtype);
  const sectorLabel = subtype?.label ?? "business";

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayOrders = business.orders.filter((o) => o.createdAt >= todayStart);
  const todayRevenue = todayOrders.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.total, 0);
  const pendingOrders = business.orders.filter((o) => o.status === "PENDING" || o.status === "CONFIRMED").length;
  const lowStock = business.products.filter((p) => p.stock <= p.lowStockThreshold).length;
  const openConvos = business.conversations.length;

  const facts: string[] = [];
  if (todayRevenue > 0) facts.push(`GH₵${todayRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} in sales today across ${todayOrders.length} order${todayOrders.length === 1 ? "" : "s"}`);
  if (pendingOrders > 0) facts.push(`${pendingOrders} order${pendingOrders === 1 ? "" : "s"} need your attention`);
  if (lowStock > 0) facts.push(`${lowStock} product${lowStock === 1 ? "" : "s"} are running low`);
  if (openConvos > 0) facts.push(`${openConvos} customer conversation${openConvos === 1 ? "" : "s"} open`);

  // Try to generate via AI for warmth + variety, with fallback to template
  try {
    const { getZaiClient } = await import("@/lib/ai-client");
    const zai = await getZaiClient();
    // Vary the style each time so it never feels repetitive
    const styles = [
      "warm and casual, like a friend greeting you",
      "brief and energetic, like a colleague who's excited to work",
      "calm and professional, like a trusted assistant",
      "playful with a tiny bit of personality",
      "thoughtful and specific, referencing one concrete detail",
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
          content: `You are ${agentName}, the AI employee at ${business.name}, a ${sectorLabel}. The owner, ${ownerFirst}, just logged in for the ${timeOfDay}. Generate a short, unique greeting (2-3 sentences max). Style: ${style}. Don't start with the same words every time -- vary your opening. Use their name naturally. Mention 1-2 relevant facts from the data if any exist. Be concise. No emojis. No "How may I assist you" type phrases. Never repeat the exact same greeting twice.`,
        },
        {
          role: "user",
          content: `Opening suggestion (you can use or ignore): "${opening}". Facts: ${facts.length > 0 ? facts.join("; ") : "It's a quiet day so far -- no orders yet today."}. Write a fresh greeting now.`,
        },
      ],
      temperature: 0.95, // very high for maximum variety
      max_tokens: 200,
    });
    const reply = (completion as any)?.choices?.[0]?.message?.content ?? "";
    if (reply && reply.length > 10) return reply.trim();
  } catch (e) {
    // fall through to template
  }

  // Template fallback
  let msg = `${greeting}, ${ownerFirst} -- ${agentName} here.`;
  if (facts.length > 0) {
    msg += ` ${facts.join(", ")}.`;
  } else {
    msg += ` Quiet day so far -- ready when you are.`;
  }
  return msg;
}
