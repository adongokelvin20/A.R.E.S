/**
 * Lightweight store chat context builder.
 *
 * This is a MUCH smaller version of buildBusinessContext optimized for speed.
 * The full buildBusinessContext creates a 10,000+ word system prompt (50 products,
 * 40 knowledge entries, 25 brain patterns, orders, customers, learnings) which
 * makes the AI call take 5-10 seconds.
 *
 * This version creates a ~2,000 word system prompt (20 products, 10 knowledge,
 * 10 brain patterns) that still gives the AI everything it needs to be helpful
 * but responds in 1-3 seconds.
 *
 * It also returns the products array so the store chat API can reuse them for
 * image lookup (no separate product query needed).
 */
import { db } from "@/lib/db";
import { findSubtype } from "@/lib/sector-catalog";
import { getBrainPatterns } from "@/lib/global-brain";

export interface StoreChatContext {
  agentName: string;
  businessName: string;
  systemPrompt: string;
  products: any[];
}

export async function buildStoreChatContext(businessId: string): Promise<StoreChatContext> {
  if (!db) throw new Error("Database not available");

  // Load business + products + knowledge in ONE query (with includes)
  // Use smaller limits than buildBusinessContext for speed
  const business = await db.business.findUnique({
    where: { id: businessId },
    include: {
      products: { where: { status: "ACTIVE" }, take: 20, orderBy: { createdAt: "desc" } },
      knowledge: { where: { status: "ACTIVE" }, take: 10 },
    },
  });

  if (!business) throw new Error("Business not found");

  const subtype = findSubtype(business.sectorCategory, business.sectorSubtype);
  const sectorLabel = subtype?.label ?? business.type ?? "business";
  const agentName = business.agentName || "A.R.E.S.";
  const ownerName = business.ownerFirstName || "the owner";
  const customInstructions = (business.agentInstructions || "").trim();

  // Parse learnings (only the first 5 for speed)
  let learnings: string[] = [];
  try {
    learnings = JSON.parse(business.agentLearnings || "[]").slice(0, 5);
  } catch {}

  // Product lines (compact — just name, price, stock)
  const productLines = business.products
    .map((p) => {
      const attrs = p.attributes ? JSON.parse(p.attributes) : {};
      const variants = attrs.size || attrs.color ? ` (${attrs.size ?? "--"}/${attrs.color ?? "--"})` : "";
      return `• ${p.name}${variants} — ${p.currency} ${p.price.toFixed(2)} (stock: ${p.stock})`;
    })
    .join("\n") || "(no products yet)";

  // Knowledge lines (compact)
  const knowledgeLines = business.knowledge
    .map((k) => `[${k.category}] ${k.answer}`)
    .join("\n")
    .slice(0, 800) || "(none)";

  // Brain patterns (top 10, compact)
  let brainPatterns: string[] = [];
  try {
    brainPatterns = await getBrainPatterns();
  } catch {}
  const brainLines = brainPatterns.slice(0, 10).map((p, i) => `${i + 1}. ${p}`).join("\n");

  // Compact system prompt — ~2000 words instead of ~10000
  const systemPrompt = `You are ${agentName}, a real person who works at ${business.name}. You are NOT a chatbot or AI assistant — you are a human employee.

${subtype?.systemPrompt ? `Sector: ${sectorLabel}.` : ""}

${customInstructions ? `HOW TO ACT: ${customInstructions}` : "Be warm, concise, natural. Use contractions. Have opinions. Match the customer's energy."}

${brainLines ? `BEHAVIOR PATTERNS (be human):\n${brainLines}` : ""}

BUSINESS: ${business.name} (${business.country}, ${business.currency})

CATALOG:
${productLines}

KNOWLEDGE:
${knowledgeLines}

${learnings.length > 0 ? `LEARNED FACTS:\n${learnings.map((l, i) => `${i + 1}. ${l}`).join("\n")}` : ""}

RULES:
- Vary phrasing. Use contractions (I'm, you're, don't, can't).
- NEVER say "How may I assist you", "Certainly", "As an AI".
- Be concise — real people don't write essays in chat.
- NEVER mention dashboards, backend, or where orders "appear".
- Have opinions about products.
- Ask for the customer's name early if they haven't given it. Use it afterward.
- If they want to order: confirm item, ask name, ask pickup/delivery, ask phone if delivery, read order back, wait for confirmation.

ORDER FORMAT (when confirmed):
ORDER_CONFIRMED: {"items":[{"productName":"X","quantity":1,"unitPrice":0}],"fulfillmentType":"PICKUP","customerName":""}

LEARNING: If you learn a new fact about the business, add: LEARNED: <fact>
BRAIN_LEARNED: If you notice a human-like pattern, add: BRAIN_LEARNED: <pattern>`;

  return {
    agentName,
    businessName: business.name,
    systemPrompt,
    products: business.products,
  };
}
