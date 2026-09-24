/**
 * Store chat context builder — uses the FULL buildBusinessContext (same as dashboard)
 * so the store agent is just as smart (learnings, knowledge, brain patterns, sector prompt).
 *
 * Adds a "don't reveal shop details" rule so the agent doesn't share internal
 * business info with customers.
 *
 * Includes a 5-minute in-memory cache for speed.
 */
import { db } from "@/lib/db";
import { buildBusinessContext } from "@/lib/ares-ai";

export interface StoreChatContext {
  agentName: string;
  businessName: string;
  systemPrompt: string;
  products: any[];
}

// ===== In-memory cache (5-minute TTL) =====
const contextCache = new Map<string, { context: StoreChatContext; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function buildStoreChatContext(businessId: string): Promise<StoreChatContext> {
  if (!db) throw new Error("Database not available");

  // Check cache first
  const cached = contextCache.get(businessId);
  if (cached && cached.expiry > Date.now()) {
    return cached.context;
  }

  // Use the FULL buildBusinessContext (same as dashboard) — gives the agent
  // learnings, knowledge, brain patterns, sector prompt, real-time data
  const ctx = await buildBusinessContext(businessId);

  // Get the products (for image lookup + matching)
  const products = await db.product.findMany({
    where: { businessId, status: "ACTIVE" },
    take: 20,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, price: true, currency: true, imageUrl: true, imageAlt: true, stock: true, description: true, attributes: true },
  });

  // Build a product matching guide — includes imageAlt (AI-analyzed description)
  // so the agent can match customer descriptions to products
  const productGuide = products.map((p) => {
    const attrs = p.attributes ? JSON.parse(p.attributes) : {};
    const variants = attrs.size || attrs.color ? ` (sizes: ${attrs.size ?? "—"}, colors: ${attrs.color ?? "—"})` : "";
    const alt = p.imageAlt ? ` [visual: ${p.imageAlt}]` : "";
    const desc = p.description ? ` — ${p.description.slice(0, 80)}` : "";
    return `• ${p.name}${variants} — ${p.currency} ${p.price.toFixed(2)} (stock: ${p.stock})${alt}${desc}`;
  }).join("\n") || "(no products yet)";

  // Take the dashboard system prompt and ADD store-specific rules
  const storePrompt = `${ctx.systemPrompt}

===== STORE CHAT RULES (you're talking to a customer on the online store) =====
- You're chatting with a CUSTOMER on the store website. Be warm, natural, human-like.
- NEVER reveal internal business details: owner's name, dashboard info, revenue, customer count, stock counts (just say "in stock" or "running low"), internal systems, backend, or how the system works.
- If asked "are you a bot/AI", deflect naturally: "I'm ${ctx.agentName}, I help out at ${ctx.businessName}."
- Use the customer's name once you know it. Ask for it early if they haven't given it.
- Be MORE human-like: vary your phrasing, react to their energy, use contractions, have opinions, crack a light joke when it fits.
- Match the customer's tone — if they're casual, be casual. If they're formal, be polished.
- Never start two messages the same way. Never repeat the same greeting.

===== PRODUCT MATCHING =====
When a customer describes a product ("do you have something red?", "I'm looking for a hoodie"), use the product guide below to match their description. The [visual: ...] tags are AI-analyzed descriptions of the product images — use them to match what the customer is describing.

PRODUCTS:
${productGuide}

If a customer's description matches a product (by name, color, type, or visual description), recommend it naturally: "Oh, you might like the [product] — it's [relevant detail]."

===== ORDER FLOW (follow exactly — NEVER skip steps) =====
1. Confirm what they want (item, size/color, quantity)
2. Ask for their NAME: "What name should I put this under?"
3. Ask: "Is this for pickup or delivery?"
4. IF DELIVERY — ask for ALL THREE:
   - Delivery LOCATION: "Where should we deliver it?"
   - Delivery TIME: "What time works for you?"
   - Phone number: "What's your number in case we need to reach you?"
5. IF PICKUP — ask for:
   - When they'll come: "When will you swing by to pick it up?"
6. Read the full order back to them (item, name, pickup/delivery, location+time if delivery, pickup time if pickup)
7. Wait for them to confirm ("yes", "that's right", "confirm")
8. ONLY after they confirm, emit the ORDER_CONFIRMED marker

NEVER confirm an order without getting: name + (delivery: location, time, phone) OR (pickup: when they'll come).

Order format (ONLY when all details collected AND customer confirmed):
ORDER_CONFIRMED: {"items":[{"productName":"X","quantity":1,"unitPrice":0}],"fulfillmentType":"PICKUP","deliveryLocation":"","deliveryTime":"","deliveryPhone":"","customerName":""}`;

  const context = {
    agentName: ctx.agentName,
    businessName: ctx.business.name,
    systemPrompt: storePrompt,
    products,
  };

  // Cache for 5 minutes
  contextCache.set(businessId, { context, expiry: Date.now() + CACHE_TTL });

  return context;
}

export function clearContextCache(businessId?: string) {
  if (businessId) {
    contextCache.delete(businessId);
  } else {
    contextCache.clear();
  }
}
