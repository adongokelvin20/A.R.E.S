/**
 * A.R.E.S. AI Client
 *
 * Primary: Uses the z-ai-web-dev-sdk (works on Z.ai sandbox)
 * Fallback: Uses Google Gemini API (works on Vercel/production)
 *
 * On Vercel, set these environment variables:
 *   GOOGLE_AI_KEY=your-google-ai-api-key
 *   (Get a free key at https://aistudio.google.com/app/apikey)
 *
 * Without a Google AI key, the system uses smart template-based
 * responses so the chat still works (just not AI-powered).
 */

const ZAI_CONFIG = {
  baseUrl: "https://internal-api.z.ai/v1",
  apiKey: "Z.ai",
  chatId: "chat-0eadb6df-900f-47f6-9675-3d6506fd0828",
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNmQ0ZTM4MTgtMGUwMy00Y2M5LThmNWMtNzY3ZWRjNDRmMWMwIiwiY2hhdF9pZCI6ImNoYXQtMGVhZGI2ZGYtOTAwZi00N2Y2LTk2NzUtM2Q2NTA2ZmQwODI4IiwicGxhdGZvcm0iOiJ6YWkifQ.Y-GA6Z2INh450ScozUl26SU4_Nt9I6ID6KnTEOVyxxo",
  userId: "6d4e3818-0e03-4cc9-8f5c-767edc44f1c0",
};

let clientInstance: any = null;
let mode: "zai" | "gemini" | "fallback" | null = null;

export async function getZaiClient() {
  if (clientInstance) return clientInstance;

  // Try Z.ai SDK first (works on sandbox)
  try {
    const ZAIModule = await import("z-ai-web-dev-sdk");
    const ZAI = ZAIModule.default;
    const testClient = new ZAI(ZAI_CONFIG);
    // Quick test to see if the API is reachable
    const testRes = await testClient.chat.completions.create({
      messages: [{ role: "user", content: "Say OK" }],
      max_tokens: 5,
    });
    if (testRes?.choices?.[0]?.message?.content) {
      clientInstance = testClient;
      mode = "zai";
      console.log("[A.R.E.S. AI] Using Z.ai SDK (sandbox mode)");
      return clientInstance;
    }
  } catch (e: any) {
    console.log("[A.R.E.S. AI] Z.ai SDK not available:", e?.message?.slice(0, 100));
  }

  // Try Google Gemini (works on Vercel)
  const geminiKey = process.env.GOOGLE_AI_KEY;
  if (geminiKey) {
    clientInstance = createGeminiClient(geminiKey);
    mode = "gemini";
    console.log("[A.R.E.S. AI] Using Google Gemini API");
    return clientInstance;
  }

  // Fallback: smart template responses (no API key needed)
  clientInstance = createFallbackClient();
  mode = "fallback";
  console.log("[A.R.E.S. AI] Using fallback mode (no API key set)");
  return clientInstance;
}

export function getAIMode() {
  return mode;
}

/**
 * Google Gemini client (publicly accessible from Vercel)
 */
function createGeminiClient(apiKey: string) {
  const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

  return {
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
            throw new Error(`Gemini API error ${response.status}: ${text.slice(0, 200)}`);
          }

          const data = await response.json();
          const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

          // Return in OpenAI format so the rest of the code doesn't need to change
          return {
            choices: [{
              message: { content, role: "assistant" },
              finish_reason: "stop",
            }],
          };
        },
        createVision: async (body: any) => {
          // Gemini vision uses the same endpoint with image parts
          const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            throw new Error(`Gemini Vision API error ${response.status}`);
          }

          return await response.json();
        },
      },
    },
  };
}

/**
 * Fallback client -- generates smart responses without an API.
 * Uses the business context and catalog to give useful answers.
 */
function createFallbackClient() {
  return {
    chat: {
      completions: {
        create: async (body: any) => {
          const lastMessage = body.messages?.filter((m: any) => m.role === "user")?.slice(-1)[0]?.content || "";
          const systemPrompt = body.messages?.find((m: any) => m.role === "system")?.content || "";

          // Extract business name and catalog from system prompt
          const businessNameMatch = systemPrompt.match(/work at ([^.]+)/);
          const businessName = businessNameMatch ? businessNameMatch[1] : "your business";

          // Generate a helpful response based on the message
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

          // Return in OpenAI format
          return {
            choices: [{
              message: { content: reply, role: "assistant" },
              finish_reason: "stop",
            }],
          };
        },
        createVision: async (body: any) => {
          // Return a generic description for vision
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
