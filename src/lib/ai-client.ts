/**
 * A.R.E.S. AI Client
 *
 * Tries multiple AI APIs in order:
 * 1. Z.ai SDK (sandbox only - internal API)
 * 2. Z.ai Open API (publicly accessible from Vercel - needs ZAI_API_KEY)
 * 3. Smart fallback (no API needed)
 *
 * To enable the Z.ai Open API on Vercel:
 * 1. Go to https://z.ai/api and create an account
 * 2. Get your API key from the dashboard
 * 3. Set ZAI_API_KEY environment variable in Vercel
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

  const isVercel = !!process.env.VERCEL || process.env.NODE_ENV === "production";

  // 1. On sandbox: use Z.ai SDK directly
  if (!isVercel) {
    try {
      const ZAIModule = await import("z-ai-web-dev-sdk");
      const ZAI = ZAIModule.default;
      clientInstance = new ZAI(ZAI_CONFIG);
      console.log("[A.R.E.S. AI] Using Z.ai SDK (sandbox mode)");
      return clientInstance;
    } catch (e) {
      console.log("[A.R.E.S. AI] SDK failed, trying Open API");
    }
  }

  // 2. On Vercel: call Z.ai API directly (no SDK, no config file, no filesystem writes)
  try {
    clientInstance = createDirectZaiClient();
    console.log("[ChatBiz AI] Using Z.ai direct API");
    return clientInstance;
  } catch (e: any) {
    console.log("[ChatBiz AI] Direct Z.ai failed:", e?.message?.slice(0, 100));
  }

  // 3. Try Z.ai Open API (if API key is set)
  const openApiKey = process.env.ZAI_API_KEY;
  if (openApiKey) {
    clientInstance = createOpenApiClient(openApiKey);
    console.log("[ChatBiz AI] Using Z.ai Open API");
    return clientInstance;
  }

  // 4. Fallback: smart responses
  clientInstance = createSmartClient();
  console.log("[ChatBiz AI] Using smart fallback mode");
  return clientInstance;
}

export async function getChatClient() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) return createOpenRouterChatClient(openRouterKey);
  return getZaiClient();
}

/**
 * Returns a chat client that falls back from OpenRouter → Z.ai.
 * Use this in the store chat route so that when OpenRouter hits rate limits,
 * the system automatically falls back to Z.ai instead of showing an error.
 */
export async function getChatClientWithFallback() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    return {
      _mode: "fallback",
      _provider: "openrouter-with-zai-fallback",
      chat: {
        completions: {
          create: async (body: any) => {
            // Try OpenRouter first
            try {
              const client = createOpenRouterChatClient(openRouterKey);
              return await client.chat.completions.create(body);
            } catch (openRouterErr: any) {
              console.warn("[ChatBiz AI] OpenRouter failed, falling back to Z.ai:", openRouterErr?.message?.slice(0, 100));
              // Fall back to Z.ai
              const zaiClient = await getZaiClient();
              return await zaiClient.chat.completions.create(body);
            }
          },
        },
      },
    };
  }
  return getZaiClient();
}

function createOpenRouterChatClient(apiKey: string) {
  const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
  const MODELS = ["nvidia/nemotron-3-ultra-550b-a55b:free", "nvidia/nemotron-3-super-120b-a12b:free", "stealth/space-bunny-alpha"];
  return { _mode: "openrouter", _provider: "openrouter", chat: { completions: { create: async (body: any) => {
    let lastError: any = null;
    for (const model of MODELS) {
      try {
        const response = await fetch(OPENROUTER_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "HTTP-Referer": "https://ares-two-eta.vercel.app", "X-Title": "ChatBiz" }, body: JSON.stringify({ model, messages: body.messages, temperature: body.temperature ?? 0.85, max_tokens: body.max_tokens ?? 700, thinking: { type: "disabled" } }) });
        if (!response.ok) { const text = await response.text(); lastError = new Error(`OpenRouter ${model} error ${response.status}: ${text.slice(0, 200)}`); if (response.status === 401) throw lastError; if (response.status === 429 || response.status === 402 || response.status === 404) continue; throw lastError; }
        return await response.json();
      } catch (e: any) { lastError = e; continue; }
    }
    throw lastError || new Error("All OpenRouter models failed");
  }}}};
}

let visionClientInstance: any = null;

export async function getVisionClient() {
  if (visionClientInstance) return visionClientInstance;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) { visionClientInstance = createOpenRouterVisionClient(openRouterKey); return visionClientInstance; }
  const zaiClient = await getZaiClient();
  visionClientInstance = { _provider: "zai", analyze: async (imageBase64: string, prompt: string) => { const res = await zaiClient.chat.completions.createVision({ model: "glm-4v-flash", messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageBase64 } }] }] }); return (res as any)?.choices?.[0]?.message?.content?.toString().trim() ?? ""; } };
  return visionClientInstance;
}

function createOpenRouterVisionClient(apiKey: string) {
  const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
  const MODELS = ["stealth/space-bunny-alpha", "qwen/qwen3.8-27b:free", "google/gemma-4-31b-it:free", "openrouter/free"];
  return { _provider: "openrouter", analyze: async (imageBase64: string, prompt: string): Promise<string> => {
    let lastError: any = null;
    for (const model of MODELS) {
      try {
        const response = await fetch(OPENROUTER_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "HTTP-Referer": "https://ares-two-eta.vercel.app", "X-Title": "A.R.E.S." }, body: JSON.stringify({ model, messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageBase64 } }] }], temperature: 0.1, max_tokens: 1024 }) });
        if (!response.ok) { const text = await response.text(); lastError = new Error(`OpenRouter ${model} error ${response.status}: ${text.slice(0, 300)}`); if (response.status === 401) throw lastError; if (response.status === 402 || response.status === 429 || response.status === 404) continue; throw lastError; }
        const json = await response.json(); const text = json?.choices?.[0]?.message?.content?.toString().trim() ?? ""; if (text) return text;
      } catch (e: any) { lastError = e; continue; }
    }
    throw lastError || new Error("All vision models failed");
  }};
}

/**
 * Convenience helper — returns both the chat client (getChatClient) and vision
 * client (getVisionClient) in a single call. Used by routes that need both.
 */
export async function getClients() {
  const chat = await getChatClient();
  const vision = await getVisionClient();
  return { chat, vision };
}

/**
 * Z.ai Open API client (publicly accessible from Vercel)
 * Uses open.bigmodel.cn which is the public API endpoint
 */
/**
 * Direct Z.ai API client — calls the Z.ai internal API directly using fetch.
 * No SDK, no config file writes, no filesystem dependencies.
 * Works on Vercel serverless (read-only filesystem).
 */
function createDirectZaiClient() {
  return {
    _mode: "zai-direct",
    _provider: "zai-direct",
    chat: {
      completions: {
        create: async (body: any) => {
          const response = await fetch("https://internal-api.z.ai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${ZAI_CONFIG.apiKey}`,
              "X-Z-AI-From": "Z",
              "X-Chat-Id": ZAI_CONFIG.chatId,
              "X-User-Id": ZAI_CONFIG.userId,
              "X-Token": ZAI_CONFIG.token,
            },
            body: JSON.stringify({
              model: "glm-4.5-flash",
              messages: body.messages,
              temperature: body.temperature ?? 0.85,
              max_tokens: body.max_tokens ?? 700,
            }),
          });
          if (!response.ok) {
            const text = await response.text();
            throw new Error(`Z.ai direct API error ${response.status}: ${text.slice(0, 200)}`);
          }
          return await response.json();
        },
        createVision: async (body: any) => {
          const response = await fetch("https://internal-api.z.ai/v1/chat/completions/vision", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${ZAI_CONFIG.apiKey}`,
              "X-Z-AI-From": "Z",
              "X-Chat-Id": ZAI_CONFIG.chatId,
              "X-User-Id": ZAI_CONFIG.userId,
              "X-Token": ZAI_CONFIG.token,
            },
            body: JSON.stringify({
              model: "glm-4v-flash",
              messages: body.messages,
            }),
          });
          if (!response.ok) {
            const text = await response.text();
            throw new Error(`Z.ai vision API error ${response.status}: ${text.slice(0, 200)}`);
          }
          return await response.json();
        },
      },
    },
  };
}

function createOpenApiClient(apiKey: string) {
  const OPEN_API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

  return {
    _mode: "openapi",
    chat: {
      completions: {
        create: async (body: any) => {
          const response = await fetch(OPEN_API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "glm-4.5-flash",
              messages: body.messages,
              temperature: body.temperature ?? 0.85,
              max_tokens: body.max_tokens ?? 700,
              thinking: { type: "disabled" },
            }),
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(`Open API error ${response.status}: ${text.slice(0, 100)}`);
          }

          return await response.json();
        },
        createVision: async (body: any) => {
          const response = await fetch(OPEN_API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "glm-4v-flash",
              messages: body.messages,
              thinking: { type: "disabled" },
            }),
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(`Vision API error ${response.status}: ${text.slice(0, 200)}`);
          }
          return await response.json();
        },
      },
    },
  };
}

/**
 * Smart fallback client
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

          const businessNameMatch = systemPrompt.match(/work at ([^.]+)/);
          const businessName = businessNameMatch ? businessNameMatch[1].trim() : "our business";

          const catalogMatch = systemPrompt.match(/CATALOG[\s\S]*?=====/);
          const catalogText = catalogMatch ? catalogMatch[0] : "";
          const productLines = catalogText.match(/• ([^—]+)—/g) || [];
          const products = productLines.map((p: string) => p.replace(/• ([^—]+)—/, "$1").trim()).slice(0, 5);
          const priceMatches = [...catalogText.matchAll(/• ([^—]+)—\s*\w+\s*([\d.]+)/g)];
          const productPrices = priceMatches.map(m => ({ name: m[1].trim(), price: m[2] }));

          let reply = "";

          if (/^(hello|hi|hey|good morning|good afternoon|good evening|good day)\b/i.test(lastMessage)) {
            const greetings = [
              `Hey! Thanks for reaching out to ${businessName}. How can I help you today?`,
              `Hi there! Welcome to ${businessName}. What can I do for you?`,
              `Hello! Thanks for stopping by ${businessName}. How can I help?`,
            ];
            reply = greetings[Math.floor(Math.random() * greetings.length)];
          } else if (/price|how much|cost/i.test(lastMessage)) {
            if (productPrices.length > 0) {
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
          } else if (/product|menu|what do you have|available|show me|do you have/i.test(lastMessage)) {
            if (products.length > 0) {
              reply = `Here's what we have available right now:\n${products.map(p => `• ${p}`).join("\n")}\n\nWould you like to know more about any of these?`;
            } else {
              reply = `We have a great selection! What are you looking for specifically?`;
            }
          } else if (/order|buy|purchase|get one|i want|i'll take|book|reserve/i.test(lastMessage)) {
            reply = `Great! I'd love to help you with that. What's your name? And would you like pickup or delivery?`;
          } else if (/delivery|deliver/i.test(lastMessage)) {
            reply = `Yes, we do deliver! To set up your delivery, I'll need:\n• Your name\n• Your delivery location\n• Preferred delivery time\n• Your phone number\n\nWhat's your name?`;
          } else if (/pickup|pick up|collect/i.test(lastMessage)) {
            reply = `Perfect! Pickup is available. What's your name and phone number so I can have it ready for you?`;
          } else if (/thank/i.test(lastMessage)) {
            reply = `You're welcome! Anything else I can help with?`;
          } else if (/bye|goodbye|see you/i.test(lastMessage)) {
            reply = `Take care! Feel free to message us anytime. Have a great day!`;
          } else if (/my name is|i'm |this is /i.test(lastMessage)) {
            const nameMatch = lastMessage.match(/(?:my name is|i'm |this is )([a-z\s]+)/i);
            const name = nameMatch ? nameMatch[1].trim().split(" ")[0] : "there";
            reply = `Nice to meet you, ${name}! Would you like pickup or delivery for your order?`;
          } else {
            const mentionedProduct = products.find(p => lastMessage.includes(p.toLowerCase().split(" ")[0]));
            if (mentionedProduct) {
              const priceInfo = productPrices.find(p => p.name === mentionedProduct);
              reply = `Yes, we have ${mentionedProduct}${priceInfo ? ` for ${priceInfo.price}` : ""}! Would you like to order one?`;
            } else {
              reply = `I'd love to help with that! Could you tell me a bit more about what you're looking for?`;
            }
          }

          return {
            choices: [{ message: { content: reply, role: "assistant" }, finish_reason: "stop" }],
          };
        },
        createVision: async () => ({
          choices: [{ message: { content: "Product image uploaded.", role: "assistant" } }],
        }),
      },
    },
  };
}
