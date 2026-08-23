/**
 * A.R.E.S. AI Client
 *
 * On Vercel: Uses Google Gemini API (publicly accessible)
 * On Z.ai sandbox: Uses the z-ai-web-dev-sdk directly
 * Fallback: Smart template responses (no API key needed)
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

  // Check if we're on Vercel (production) -- skip Z.ai SDK entirely
  // because internal-api.z.ai is not accessible from Vercel
  const isVercel = !!process.env.VERCEL || process.env.NODE_ENV === "production";

  if (!isVercel) {
    // On sandbox/dev: try Z.ai SDK
    try {
      const ZAIModule = await import("z-ai-web-dev-sdk");
      const ZAI = ZAIModule.default;
      clientInstance = new ZAI(ZAI_CONFIG);
      console.log("[A.R.E.S. AI] Using Z.ai SDK (sandbox mode)");
      return clientInstance;
    } catch (e: any) {
      console.log("[A.R.E.S. AI] Z.ai SDK failed, trying Gemini");
    }
  }

  // On Vercel or SDK failed: try Google Gemini
  const geminiKey = process.env.GOOGLE_AI_KEY;
  if (geminiKey) {
    try {
      clientInstance = createGeminiClient(geminiKey);
      console.log("[A.R.E.S. AI] Using Google Gemini API");
      return clientInstance;
    } catch (e: any) {
      console.error("[A.R.E.S. AI] Gemini setup failed:", e?.message);
    }
  }

  // Fallback: smart template responses
  clientInstance = createFallbackClient();
  console.log("[A.R.E.S. AI] Using fallback mode (no API key or all APIs failed)");
  return clientInstance;
}

export function getAIMode() {
  return clientInstance?._mode || "unknown";
}

/**
 * Google Gemini client (publicly accessible from Vercel)
 */
function createGeminiClient(apiKey: string) {
  const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

  const client = {
    _mode: "gemini",
    chat: {
      completions: {
        create: async (body: any) => {
          // Convert OpenAI format to Gemini format
          const systemPrompt = body.messages?.find((m: any) => m.role === "system")?.content || "";
          const conversationMessages = body.messages?.filter((m: any) => m.role !== "system") || [];

          const contents = conversationMessages.map((m: any) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));

          const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents,
              systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
              generationConfig: {
                temperature: body.temperature ?? 0.85,
                maxOutputTokens: body.max_tokens ?? 700,
              },
            }),
          });

          if (!response.ok) {
            const text = await response.text();
            console.error("[A.R.E.S. AI] Gemini error:", response.status, text.slice(0, 200));
            throw new Error(`Gemini API error ${response.status}: ${text.slice(0, 100)}`);
          }

          const data = await response.json();
          const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

          if (!content) {
            console.error("[A.R.E.S. AI] Gemini returned empty:", JSON.stringify(data).slice(0, 200));
            throw new Error("Gemini returned empty response");
          }

          // Return in OpenAI format so the rest of the code doesn't need to change
          return {
            choices: [{
              message: { content, role: "assistant" },
              finish_reason: "stop",
            }],
          };
        },
        createVision: async (body: any) => {
          // For vision, use gemini-1.5-pro which supports images
          const VISION_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

          const response = await fetch(`${VISION_URL}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            throw new Error(`Gemini Vision API error ${response.status}`);
          }

          const data = await response.json();
          const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Product image uploaded.";

          return {
            choices: [{
              message: { content, role: "assistant" },
            }],
          };
        },
      },
    },
  };

  return client;
}

/**
 * Fallback client -- generates smart responses without an API.
 */
function createFallbackClient() {
  return {
    _mode: "fallback",
    chat: {
      completions: {
        create: async (body: any) => {
          const lastMessage = body.messages?.filter((m: any) => m.role === "user")?.slice(-1)[0]?.content || "";
          const systemPrompt = body.messages?.find((m: any) => m.role === "system")?.content || "";

          const businessNameMatch = systemPrompt.match(/work at ([^.]+)/);
          const businessName = businessNameMatch ? businessNameMatch[1] : "your business";

          let reply = "";

          if (/hello|hi|hey|good morning|good afternoon|good evening/i.test(lastMessage)) {
            const greetings = [
              `Hey! Thanks for reaching out to ${businessName}. How can I help you today?`,
              `Hi there! What can I do for you?`,
              `Hello! I'm here to help. What do you need?`,
            ];
            reply = greetings[Math.floor(Math.random() * greetings.length)];
          } else if (/price|how much|cost/i.test(lastMessage)) {
            reply = `I'd be happy to help with pricing. Let me check what we have available. Could you tell me which product you're interested in?`;
          } else if (/order|buy|purchase/i.test(lastMessage)) {
            reply = `Great! I'd love to help you place an order. What would you like to get, and is this for pickup or delivery?`;
          } else if (/delivery|deliver/i.test(lastMessage)) {
            reply = `Yes, we do deliver! Just share your location, preferred delivery time, and phone number, and I'll sort it out for you.`;
          } else if (/thank/i.test(lastMessage)) {
            reply = `You're welcome! Anything else I can help with?`;
          } else if (/product|menu|what do you have|available/i.test(lastMessage)) {
            reply = `Let me tell you what we have available. What are you looking for specifically?`;
          } else {
            reply = `I've noted your message. Let me help you with that -- could you give me a bit more detail about what you need?`;
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
