/**
 * MINIMAL store chat context builder — optimized for speed.
 *
 * The system prompt is ~500 words (just the essentials: business name,
 * top 10 products with prices, core behavior rules). This makes the AI
 * respond in 1-2 seconds instead of 5-10.
 *
 * Includes a 5-minute in-memory cache so repeat messages from the same
 * business skip the DB entirely (context is served from memory).
 */
import { db } from "@/lib/db";
import { findSubtype } from "@/lib/sector-catalog";

export interface StoreChatContext {
  agentName: string;
  businessName: string;
  systemPrompt: string;
  products: any[];
}

// ===== In-memory cache (5-minute TTL) =====
// Key: businessId, Value: { context, expiry }
const contextCache = new Map<string, { context: StoreChatContext; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function buildStoreChatContext(businessId: string): Promise<StoreChatContext> {
  if (!db) throw new Error("Database not available");

  // Check cache first
  const cached = contextCache.get(businessId);
  if (cached && cached.expiry > Date.now()) {
    return cached.context;
  }

  // Load business + products (only 10 products, no knowledge/orders/customers for speed)
  const business = await db.business.findUnique({
    where: { id: businessId },
    include: {
      products: { where: { status: "ACTIVE" }, take: 10, orderBy: { createdAt: "desc" } },
    },
  });

  if (!business) throw new Error("Business not found");

  const subtype = findSubtype(business.sectorCategory, business.sectorSubtype);
  const sectorLabel = subtype?.label ?? business.type ?? "business";
  const agentName = business.agentName || "A.R.E.S.";
  const customInstructions = (business.agentInstructions || "").trim();

  // Compact product list (just name + price)
  const productLines = business.products
    .map((p) => `${p.name} — ${p.currency} ${p.price.toFixed(2)} (stock: ${p.stock})`)
    .join("\n") || "(no products yet)";

  // MINIMAL system prompt — ~500 words
  const systemPrompt = `You are ${agentName}, a real employee at ${business.name} (${sectorLabel}). You are NOT a chatbot.

${customInstructions ? `Personality: ${customInstructions.slice(0, 300)}` : "Be warm, concise, use contractions, have opinions."}

Products:
${productLines}

Rules:
- Use contractions (I'm, you're, don't, can't)
- Be concise — 1-3 sentences max
- NEVER say "How may I assist you", "Certainly", "As an AI"
- NEVER mention dashboards or backend systems
- Ask for the customer's name early, use it after
- Only use products listed above. If asked about something not listed, be honest.

ORDER FLOW (follow exactly — NEVER skip steps):
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
ORDER_CONFIRMED: {"items":[{"productName":"X","quantity":1,"unitPrice":0}],"fulfillmentType":"PICKUP","deliveryLocation":"","deliveryTime":"","deliveryPhone":"","customerName":""}

Learn fact: LEARNED: <fact>
Human pattern: BRAIN_LEARNED: <pattern>`;

  const context = {
    agentName,
    businessName: business.name,
    systemPrompt,
    products: business.products,
  };

  // Cache for 5 minutes
  contextCache.set(businessId, { context, expiry: Date.now() + CACHE_TTL });

  return context;
}

/**
 * Clear the cache for a business (call when products/settings change).
 */
export function clearContextCache(businessId?: string) {
  if (businessId) {
    contextCache.delete(businessId);
  } else {
    contextCache.clear();
  }
}
