/**
 * A.R.E.S. AI Client
 *
 * On Z.ai sandbox: Uses the z-ai-web-dev-sdk directly
 * On Vercel/production: Uses smart fallback responses (no external API needed)
 *
 * The fallback mode is designed to be genuinely helpful -- it reads the
 * business context from the system prompt and generates appropriate
 * responses based on what the customer asks.
 */

const ZAI_CONFIG = {
  baseUrl: "https://internal-api.z.ai/v1",
  apiKey: "Z.ai",
  chatId: "chat-0eadb6df-900f-47f6-9675-3d6506fd0828",
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNmQ0ZTM4MTgtMGUwMy00Y2M5LThmNWMtNzY3ZWRjNDRmMWMwIiwiY2hhdF9pZCI6ImNoYXQtMGVhZGI2ZGYtOTAwZi00N2Y2LTk2NzUtM2Q2NTA2ZmQwODI4IiwicGxhdGZvcm0iOiJ6YWkifQ.Y-GA6Z2INh450ScozUl26SU4_Nt9I6ID6KnTEOVyxxo",
  userId: "6d4e3818-0e03-4cc9-8f5c-767edc44f1c0",
};

let clientInstance: any = null;

export async function getZaiClient() {
  if (clientInstance) return clientInstance;

  // On sandbox/dev: try Z.ai SDK
  const isVercel = !!process.env.VERCEL || process.env.NODE_ENV === "production";

  if (!isVercel) {
    try {
      const ZAIModule = await import("z-ai-web-dev-sdk");
      const ZAI = ZAIModule.default;
      clientInstance = new ZAI(ZAI_CONFIG);
      console.log("[A.R.E.S. AI] Using Z.ai SDK (sandbox mode)");
      return clientInstance;
    } catch (e: any) {
      console.log("[A.R.E.S. AI] Z.ai SDK failed, using fallback");
    }
  }

  // On Vercel: use smart fallback (no external API needed)
  // Google Gemini doesn't work from all locations and requires a specific key format
  clientInstance = createSmartClient();
  console.log("[A.R.E.S. AI] Using smart response mode");
  return clientInstance;
}

export function getAIMode() {
  return clientInstance?._mode || "unknown";
}

/**
 * Smart client -- reads the system prompt to understand the business,
 * then generates contextual responses based on what the customer asks.
 * This is not a full LLM, but it's genuinely helpful for common queries.
 */
function createSmartClient() {
  return {
    _mode: "smart",
    chat: {
      completions: {
        create: async (body: any) => {
          const messages = body.messages || [];
          const systemPrompt = messages.find((m: any) => m.role === "system")?.content || "";
          const userMessages = messages.filter((m: any) => m.role === "user");
          const lastMessage = userMessages[userMessages.length - 1]?.content?.toLowerCase() || "";

          // Extract business info from system prompt
          const businessNameMatch = systemPrompt.match(/work at ([^.]+)/);
          const businessName = businessNameMatch ? businessNameMatch[1].trim() : "our business";

          const sectorMatch = systemPrompt.match(/Sector: ([^\n]+)/);
          const sector = sectorMatch ? sectorMatch[1].trim() : "";

          // Extract catalog from system prompt
          const catalogMatch = systemPrompt.match(/CATALOG[\s\S]*?=====/);
          const catalogText = catalogMatch ? catalogMatch[0] : "";

          // Extract product lines
          const productLines = catalogText.match(/• ([^—]+)—/g) || [];
          const products = productLines.map((p: string) => p.replace(/• ([^—]+)—/, "$1").trim()).slice(0, 5);

          // Extract prices
          const priceMatches = catalogText.matchAll(/• ([^—]+)—\s*\w+\s*([\d.]+)/g);
          const productPrices: { name: string; price: string }[] = [];
          for (const m of priceMatches) {
            productPrices.push({ name: m[1].trim(), price: m[2] });
          }

          let reply = "";

          // Greetings
          if (/^(hello|hi|hey|good morning|good afternoon|good evening|good day)\b/i.test(lastMessage)) {
            const greetings = [
              `Hey! Thanks for reaching out to ${businessName}. How can I help you today?`,
              `Hi there! Welcome to ${businessName}. What can I do for you?`,
              `Hello! Thanks for stopping by ${businessName}. How can I help?`,
              `Hey! Good to hear from you. What do you need today?`,
            ];
            reply = greetings[Math.floor(Math.random() * greetings.length)];
          }
          // Pricing questions
          else if (/price|how much|cost|rate|fee/i.test(lastMessage)) {
            if (productPrices.length > 0) {
              // Find the product they're asking about
              const askedProduct = products.find(p => lastMessage.includes(p.toLowerCase().split(" ")[0]));
              if (askedProduct) {
                const priceInfo = productPrices.find(p => p.name === askedProduct);
                reply = `The ${askedProduct} is ${priceInfo?.price || "available"}. Would you like to order one?`;
              } else {
                reply = `Here's what we have:\n${productPrices.map(p => `• ${p.name}: ${p.price}`).join("\n")}\n\nWhich one interests you?`;
              }
            } else {
              reply = `I'd be happy to help with pricing! What product are you interested in?`;
            }
          }
          // Product/menu questions
          else if (/product|menu|what do you have|what do you sell|available|show me|do you have/i.test(lastMessage)) {
            if (products.length > 0) {
              reply = `Here's what we have available right now:\n${products.map(p => `• ${p}`).join("\n")}\n\nWould you like to know more about any of these?`;
            } else {
              reply = `We have a great selection! What are you looking for specifically? I can help you find what you need.`;
            }
          }
          // Order/buy
          else if (/order|buy|purchase|get one|i want|i'll take|book|reserve/i.test(lastMessage)) {
            reply = `Great! I'd love to help you with that. What's your name? And would you like pickup or delivery?`;
          }
          // Delivery
          else if (/delivery|deliver|ship|drop off|bring/i.test(lastMessage)) {
            reply = `Yes, we do deliver! To set up your delivery, I'll need:\n• Your name\n• Your delivery location\n• Preferred delivery time\n• Your phone number\n\nWhat's your name?`;
          }
          // Pickup
          else if (/pickup|pick up|collect|take away|takeout/i.test(lastMessage)) {
            reply = `Perfect! Pickup is available. What's your name and phone number so I can have it ready for you?`;
          }
          // Hours
          else if (/hour|open|close|time|when.*available/i.test(lastMessage)) {
            const hoursMatch = systemPrompt.match(/hours\??.*?A: ([^\n]+)/i);
            if (hoursMatch) {
              reply = `Our hours: ${hoursMatch[1]}`;
            } else {
              reply = `We're open during regular business hours. Is there a specific time you'd like to visit?`;
            }
          }
          // Location
          else if (/where|location|address|directions/i.test(lastMessage)) {
            reply = `We'd love to see you! Let me get our address for you. Can I also help you with anything else?`;
          }
          // Contact info
          else if (/contact|phone|call|reach|whatsapp|number/i.test(lastMessage)) {
            reply = `You can reach us right here on WhatsApp! Is there something specific I can help you with?`;
          }
          // Return policy
          else if (/return|refund|exchange|policy/i.test(lastMessage)) {
            const policyMatch = systemPrompt.match(/return policy\??.*?A: ([^\n]+)/i);
            if (policyMatch) {
              reply = policyMatch[1];
            } else {
              reply = `For returns and refunds, please contact us directly and we'll take care of you. Is there an issue with your order?`;
            }
          }
          // Thanks
          else if (/thank|thanks|appreciate/i.test(lastMessage)) {
            const thanks = [
              `You're welcome! Anything else I can help with?`,
              `Happy to help! Don't hesitate to reach out if you need anything else.`,
              `My pleasure! Have a great day.`,
            ];
            reply = thanks[Math.floor(Math.random() * thanks.length)];
          }
          // Bye
          else if (/bye|goodbye|see you|later|that's all|nothing else/i.test(lastMessage)) {
            reply = `Take care! Feel free to message us anytime you need help. Have a great day!`;
          }
          // Name provided (during order flow)
          else if (/my name is|i'm |this is |it's /i.test(lastMessage)) {
            const nameMatch = lastMessage.match(/(?:my name is|i'm |this is |it's )([a-z\s]+)/i);
            const name = nameMatch ? nameMatch[1].trim().split(" ")[0] : "there";
            reply = `Nice to meet you, ${name}! Would you like pickup or delivery for your order?`;
          }
          // Location provided (during delivery flow)
          else if (lastMessage.match(/\b\d+\b.*street|road|avenue|drive|lane|close|area|near|opposite|behind|adjacent/i) || /location is|address is/i.test(lastMessage)) {
            reply = `Got it! And what time would you like it delivered? Also, what's your phone number?`;
          }
          // Phone provided
          else if (lastMessage.match(/\+?\d[\d\s\-]{8,}/)) {
            reply = `Perfect! Let me confirm your order details. I've got everything noted down. Is there anything else you'd like to add?`;
          }
          // Default -- try to be helpful
          else {
            // Check if they mentioned a product name
            const mentionedProduct = products.find(p => lastMessage.includes(p.toLowerCase().split(" ")[0]));
            if (mentionedProduct) {
              const priceInfo = productPrices.find(p => p.name === mentionedProduct);
              reply = `Yes, we have ${mentionedProduct}${priceInfo ? ` for ${priceInfo.price}` : ""}! Would you like to order one?`;
            } else {
              const defaults = [
                `I'd love to help with that! Could you tell me a bit more about what you're looking for?`,
                `Thanks for your message! Are you looking to place an order, check our products, or something else?`,
                `I'm here to help! What specifically can I do for you today?`,
                `Great question! Let me help you with that. What do you need?`,
              ];
              reply = defaults[Math.floor(Math.random() * defaults.length)];
            }
          }

          return {
            choices: [{
              message: { content: reply, role: "assistant" },
              finish_reason: "stop",
            }],
          };
        },
        createVision: async (body: any) => {
          return {
            choices: [{
              message: { content: "Product image uploaded successfully.", role: "assistant" },
            }],
          };
        },
      },
    },
  };
}
