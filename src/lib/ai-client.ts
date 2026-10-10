/**
 * ChatBiz AI Client
 *
 * Provider chain (chat):
 *   1. Cloudflare Workers AI (Llama 3.1 8B on edge — primary, fastest, free)
 *   2. Z.ai Open API        (glm-4.5-flash — fallback)
 *   3. OpenRouter           (openrouter/free — fallback)
 *   4. Smart fallback       (rule-based replies, never fails)
 *
 * Provider chain (vision / VLM):
 *   1. OpenRouter     (primary)
 *   2. Smart fallback
 *
 * Additional features:
 *   - Cloudflare TTS (text-to-speech) — agent speaks replies
 *   - Cloudflare Translation — auto-translate customer messages
 *
 * Env vars needed (set on Vercel + locally):
 *   CLOUDFLARE_API_TOKEN   — Cloudflare API token (primary chat + TTS + translation)
 *   CLOUDFLARE_ACCOUNT_ID  — Cloudflare account ID
 *   ZAI_API_KEY            — Z.ai Open API key (chat fallback)
 *   OPENROUTER_API_KEY     — OpenRouter API key (chat fallback + vision)
 */

// ---------- Cloudflare (PRIMARY chat + TTS + translation) ----------
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_CHAT_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const CF_TTS_MODEL = "@cf/myshell-ai/melotts";
const CF_TRANSLATION_MODEL = "@cf/meta/m2m100-1.2b";

// ---------- ZAI API KEY (env) ----------
const ZAI_API_KEY = process.env.ZAI_API_KEY;
const ZAI_API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const ZAI_CHAT_MODEL = "glm-4.5-flash";

// ---------- OpenRouter ----------
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_CHAT_MODELS = ["openrouter/free"];
const OPENROUTER_VISION_MODELS = [
  "openrouter/free",
  "openrouter/free",
  "openrouter/free",
];

// ---------- Gemini (Vision) ----------
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const GEMINI_VISION_MODEL = "gemini-2.0-flash";

let zaiClientInstance: any = null;
let openRouterChatInstance: any = null;
let visionClientInstance: any = null;

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Returns a chat client with built-in fallback:
 * Cloudflare → Z.ai → OpenRouter → smart.
 *
 * Used by /api/store/chat (the storefront agent).
 */
export async function getChatClientWithFallback() {
  return {
    _mode: "fallback",
    _provider: "cloudflare-with-fallbacks",
    chat: {
      completions: {
        create: async (body: any) => {
          const messages = body.messages || [];
          const temperature = body.temperature ?? 0.85;
          const maxTokens = body.max_tokens ?? 700;

          // 1. Try Cloudflare first (fastest — runs on edge, ~300 cities)
          if (CLOUDFLARE_API_TOKEN && CLOUDFLARE_ACCOUNT_ID) {
            try {
              return await callCloudflareChat(messages, temperature, maxTokens);
            } catch (cfErr: any) {
              console.warn("[ChatBiz AI] Cloudflare failed, falling back to Z.ai:", cfErr?.message?.slice(0, 150));
            }
          }

          // 2. Fall back to Z.ai
          if (ZAI_API_KEY) {
            try {
              return await callZaiChat(messages, temperature, maxTokens);
            } catch (zaiErr: any) {
              console.warn("[ChatBiz AI] Z.ai failed, falling back to OpenRouter:", zaiErr?.message?.slice(0, 150));
            }
          }

          // 3. Fall back to OpenRouter
          if (OPENROUTER_API_KEY) {
            try {
              return await callOpenRouterChat(messages, temperature, maxTokens);
            } catch (orErr: any) {
              console.warn("[ChatBiz AI] OpenRouter failed, using smart fallback:", orErr?.message?.slice(0, 150));
            }
          }

          // 4. Smart fallback (never throws)
          return callSmartFallback(messages);
        },
      },
    },
  };
}

/**
 * Returns a Z.ai-only chat client. Used when you know you only want Z.ai.
 */
export async function getZaiClient() {
  if (zaiClientInstance) return zaiClientInstance;

  if (ZAI_API_KEY) {
    zaiClientInstance = {
      _mode: "zai-openapi",
      _provider: "zai-openapi",
      chat: {
        completions: {
          create: async (body: any) =>
            callZaiChat(body.messages || [], body.temperature ?? 0.85, body.max_tokens ?? 700),
        },
      },
    };
    console.log("[ChatBiz AI] Using Z.ai Open API (glm-4.5-flash)");
    return zaiClientInstance;
  }

  // No ZAI_API_KEY → smart fallback
  zaiClientInstance = {
    _mode: "smart",
    _provider: "smart-fallback",
    chat: {
      completions: {
        create: async (body: any) => callSmartFallback(body.messages || []),
      },
    },
  };
  console.log("[ChatBiz AI] ZAI_API_KEY not set — using smart fallback");
  return zaiClientInstance;
}

/**
 * Returns a chat client that prefers Z.ai but falls back to OpenRouter.
 * Same as getChatClientWithFallback but kept for backward compatibility.
 */
export async function getChatClient() {
  return getChatClientWithFallback();
}

/**
 * Vision / VLM client. Uses OpenRouter (openrouter/free) — confirmed working
 * for payment screenshot analysis on free tier.
 *
 * If OpenRouter returns empty/garbage, falls back to "manual review pending"
 * in the verify-payment route (never falsely rejects a real screenshot).
 */
export async function getVisionClient() {
  if (visionClientInstance) return visionClientInstance;

  if (OPENROUTER_API_KEY) {
    visionClientInstance = createOpenRouterVisionClient(OPENROUTER_API_KEY);
    console.log("[ChatBiz AI] Vision: OpenRouter (openrouter/free)");
    return visionClientInstance;
  }

  // No OpenRouter key — smart fallback (returns empty, route handles as manual review)
  visionClientInstance = {
    _provider: "smart",
    analyze: async () => "",
  };
  console.log("[ChatBiz AI] Vision: smart fallback (no OPENROUTER_API_KEY)");
  return visionClientInstance;
}

/**
 * Convenience helper — returns both chat & vision clients.
 */
export async function getClients() {
  const chat = await getChatClient();
  const vision = await getVisionClient();
  return { chat, vision };
}

// ============================================================
// INTERNAL: Cloudflare Workers AI (chat + TTS + translation)
// ============================================================

async function callCloudflareChat(messages: any[], temperature: number, maxTokens: number) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${CF_CHAT_MODEL}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
    },
    body: JSON.stringify({
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudflare chat error ${response.status}: ${text.slice(0, 200)}`);
  }

  const json = await response.json();
  if (!json.success) {
    throw new Error(`Cloudflare chat failed: ${JSON.stringify(json.errors || json).slice(0, 200)}`);
  }

  // Cloudflare returns: { result: { response: "text" } }
  const text = json.result?.response || "";
  return {
    choices: [{ message: { content: text, role: "assistant" }, finish_reason: "stop" }],
  };
}

/**
 * Cloudflare TTS — converts text to speech. Returns base64 audio (WAV format).
 */
export async function cloudflareTTS(text: string, language: string = "en"): Promise<string | null> {
  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) return null;
  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${CF_TTS_MODEL}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
      body: JSON.stringify({ prompt: text, language }),
    });

    if (!response.ok) {
      console.error("[ChatBiz AI] TTS error:", response.status);
      return null;
    }

    const json = await response.json();
    if (!json.success) {
      console.error("[ChatBiz AI] TTS failed:", json.errors);
      return null;
    }

    // Cloudflare returns: { result: { audio: "base64..." } }
    const audio = json.result?.audio || json.result;
    if (typeof audio === "string") {
      return `data:audio/wav;base64,${audio}`;
    }
    return null;
  } catch (e: any) {
    console.error("[ChatBiz AI] TTS error:", e?.message);
    return null;
  }
}

/**
 * Cloudflare Translation — translates text between languages.
 * Returns translated text or null on failure.
 */
export async function cloudflareTranslate(text: string, sourceLang: string, targetLang: string): Promise<string | null> {
  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) return null;
  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${CF_TRANSLATION_MODEL}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
      body: JSON.stringify({
        text,
        source_lang: sourceLang,
        target_lang: targetLang,
      }),
    });

    if (!response.ok) return null;

    const json = await response.json();
    if (!json.success) return null;

    return json.result?.translated_text || null;
  } catch (e: any) {
    console.error("[ChatBiz AI] Translation error:", e?.message);
    return null;
  }
}

// ============================================================
// INTERNAL: Z.ai Open API
// ============================================================

async function callZaiChat(messages: any[], temperature: number, maxTokens: number) {
  const response = await fetch(ZAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ZAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: ZAI_CHAT_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
      thinking: { type: "disabled" },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Z.ai error ${response.status}: ${text.slice(0, 200)}`);
  }

  return await response.json();
}

// ============================================================
// INTERNAL: OpenRouter (chat fallback + vision)
// ============================================================

async function callOpenRouterChat(messages: any[], temperature: number, maxTokens: number) {
  let lastError: any = null;
  for (const model of OPENROUTER_CHAT_MODELS) {
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://ares-two-eta.vercel.app",
          "X-Title": "ChatBiz",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          thinking: { type: "disabled" },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        lastError = new Error(`OpenRouter ${model} ${response.status}: ${text.slice(0, 200)}`);
        if (response.status === 401) throw lastError; // bad key, no point retrying
        if (response.status === 404 || response.status === 402 || response.status === 429) continue;
        throw lastError;
      }

      return await response.json();
    } catch (e: any) {
      lastError = e;
      continue;
    }
  }
  throw lastError || new Error("All OpenRouter chat models failed");
}

/**
 * Gemini Vision client (FREE tier — works for payment screenshot analysis).
 * Uses inline_data for the image. Returns text content only.
 */
function createGeminiVisionClient(apiKey: string) {
  return {
    _provider: "gemini",
    analyze: async (imageBase64: string, prompt: string): Promise<string> => {
      // Gemini expects raw base64 (no data URL prefix)
      const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
      const mimeType = imageBase64.match(/^data:(image\/[a-z+]+);/)?.[1] || "image/png";

      const body = {
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64Data } },
            ],
          },
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
      };

      const url = `${GEMINI_URL}?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Gemini vision error ${response.status}: ${text.slice(0, 250)}`);
      }

      const json = await response.json();
      // Gemini response shape: { candidates: [{ content: { parts: [{ text }] } }] }
      const text =
        json?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p?.text || "")
          .join("")
          .trim() ?? "";
      return text;
    },
  };
}

function createOpenRouterVisionClient(apiKey: string) {
  return {
    _provider: "openrouter",
    analyze: async (imageBase64: string, prompt: string): Promise<string> => {
      let lastError: any = null;
      let lastNonEmptyText = "";

      for (const model of OPENROUTER_VISION_MODELS) {
        try {
          const response = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "HTTP-Referer": "https://ares-two-eta.vercel.app",
              "X-Title": "ChatBiz",
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: prompt },
                    { type: "image_url", image_url: { url: imageBase64 } },
                  ],
                },
              ],
              temperature: 0.1,
              max_tokens: 1024,
            }),
          });

          if (!response.ok) {
            const text = await response.text();
            lastError = new Error(`Vision ${model} ${response.status}: ${text.slice(0, 200)}`);
            if (response.status === 401) throw lastError;
            if (response.status === 404 || response.status === 402 || response.status === 429) continue;
            throw lastError;
          }

          const json = await response.json();
          const text = json?.choices?.[0]?.message?.content?.toString().trim() ?? "";

          if (!text || text.length < 5) {
            console.warn(`[ChatBiz AI] OpenRouter ${model} returned empty content`);
            continue;
          }

          // Prefer responses that actually contain VLM markers (IS_PAYMENT, AMOUNT, etc.)
          // — these are from vision-capable models that actually analyzed the image.
          if (/IS_PAYMENT|AMOUNT|ORDER_CODE/i.test(text)) {
            console.log(`[ChatBiz AI] Vision succeeded via: ${model}`);
            return text;
          }

          // If no markers, save as fallback but keep trying other models
          if (!lastNonEmptyText) lastNonEmptyText = text;
          console.warn(`[ChatBiz AI] OpenRouter ${model} returned non-VLM text (no markers), retrying...`);
        } catch (e: any) {
          lastError = e;
          continue;
        }
      }

      // Return the last non-empty text we got, even if it didn't have markers
      // — verify-payment route will try to parse it
      if (lastNonEmptyText) {
        console.warn("[ChatBiz AI] Returning last non-empty vision response (no markers found in any attempt)");
        return lastNonEmptyText;
      }
      throw lastError || new Error("All vision models failed");
    },
  };
}

// ============================================================
// INTERNAL: Smart fallback (rule-based, never throws)
// ============================================================

function callSmartFallback(messages: any[]) {
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
  const productPrices = priceMatches.map((m) => ({ name: m[1].trim(), price: m[2] }));

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
      const askedProduct = products.find((p) => lastMessage.includes(p.toLowerCase().split(" ")[0]));
      if (askedProduct) {
        const priceInfo = productPrices.find((p) => p.name === askedProduct);
        reply = `The ${askedProduct} is ${priceInfo?.price || "available"}. Would you like to order one?`;
      } else {
        reply = `Here's what we have:\n${productPrices.map((p) => `• ${p.name}: ${p.price}`).join("\n")}\n\nWhich one interests you?`;
      }
    } else {
      reply = `I'd be happy to help with pricing! What product are you interested in?`;
    }
  } else if (/product|menu|what do you have|available|show me|do you have/i.test(lastMessage)) {
    if (products.length > 0) {
      reply = `Here's what we have available right now:\n${products.map((p) => `• ${p}`).join("\n")}\n\nWould you like to know more about any of these?`;
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
    const mentionedProduct = products.find((p) => lastMessage.includes(p.toLowerCase().split(" ")[0]));
    if (mentionedProduct) {
      const priceInfo = productPrices.find((p) => p.name === mentionedProduct);
      reply = `Yes, we have ${mentionedProduct}${priceInfo ? ` for ${priceInfo.price}` : ""}! Would you like to order one?`;
    } else {
      reply = `I'd love to help with that! Could you tell me a bit more about what you're looking for?`;
    }
  }

  return {
    choices: [{ message: { content: reply, role: "assistant" }, finish_reason: "stop" }],
  };
}
