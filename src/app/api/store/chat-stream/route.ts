/**
 * POST /api/store/chat-stream
 *   { slug, message, sessionId, history, customerName, customerPhone }
 *
 * Streaming chat endpoint — streams the agent's reply word-by-word via
 * Server-Sent Events (SSE). Falls back to non-streaming if streaming fails.
 *
 * SSE format:
 *   data: {"type":"chunk","text":"word"}\n\n
 *   data: {"type":"done","reply":"full text","orderCreated":null}\n\n
 */
import { NextRequest } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { buildStoreChatContext } from "@/lib/store-chat-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PLACEHOLDER_NAME_RE = /^(store\s*customer|customer|guest|anonymous|1st\s*customer|returning\s*customer|new\s*customer|unknown|user)$/i;

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const body = await req.json();
        const { slug, message, sessionId, history = [], customerName, customerPhone } = body;

        if (!slug || !message) {
          send({ type: "error", error: "Missing slug or message" });
          controller.close();
          return;
        }

        // Load business
        await ensureDatabase();
        let business;
        try {
          business = await db.business.findUnique({
            where: { slug },
            select: { id: true, name: true, currency: true, agentName: true, configuration: true, status: true },
          });
        } catch {
          send({ type: "error", error: "Store not found" });
          controller.close();
          return;
        }
        if (!business) {
          send({ type: "error", error: "Store not found" });
          controller.close();
          return;
        }
        if (business.status === "SUSPENDED") {
          send({ type: "error", error: `${business.name} is currently unavailable.` });
          controller.close();
          return;
        }

        const businessId = business.id;

        // Check for returning customer
        let returningCustomerName: string | null = null;
        if (sessionId) {
          try {
            const prevConvo = await db.conversation.findFirst({
              where: { businessId, externalId: sessionId, channel: "WEB", customerName: { not: null }, NOT: { customerName: { contains: "Customer" } } },
              select: { customerName: true },
              orderBy: { lastMessageAt: "desc" },
            });
            if (prevConvo?.customerName) {
              const candidate = prevConvo.customerName.trim();
              if (candidate && !PLACEHOLDER_NAME_RE.test(candidate) && candidate.toLowerCase() !== "store customer") {
                returningCustomerName = candidate;
              }
            }
          } catch {}
        }

        // Build chat context
        const context = await buildStoreChatContext(businessId);
        let systemPrompt = context.systemPrompt;
        if (returningCustomerName) {
          systemPrompt += `\n\nRETURNING CUSTOMER: This customer's name is ${returningCustomerName}. Greet them by name. Don't ask for their name again.`;
        }

        // Build messages
        const chatMessages = [
          { role: "system", content: systemPrompt },
          ...(history || []).slice(-10).map((m: any) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
          { role: "user", content: message },
        ];

        const agentName = business.agentName || business.name;
        const ZAI_API_KEY = process.env.ZAI_API_KEY;
        const ZAI_API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
        const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
        const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;

        let fullReply = "";
        let streamed = false;

        // Try Z.ai streaming first
        if (ZAI_API_KEY) {
          try {
            const response = await fetch(ZAI_API_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ZAI_API_KEY}`,
              },
              body: JSON.stringify({
                model: "glm-4.5-flash",
                messages: chatMessages,
                temperature: 0.85,
                max_tokens: 700,
                stream: true,
                thinking: { type: "disabled" },
              }),
            });

            if (response.ok && response.body) {
              streamed = true;
              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              let buffer = "";

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    const data = line.slice(6).trim();
                    if (data === "[DONE]") continue;
                    try {
                      const parsed = JSON.parse(data);
                      const chunk = parsed.choices?.[0]?.delta?.content;
                      if (chunk) {
                        fullReply += chunk;
                        send({ type: "chunk", text: chunk });
                      }
                    } catch {}
                  }
                }
              }

              // Clean the reply (strip markers)
              fullReply = fullReply
                .replace(/^LEARNED:\s*.+$/gim, "")
                .replace(/^BRAIN_LEARNED:\s*.+$/gim, "")
                .replace(/^NAME_LEARNED:\s*.+$/gim, "")
                .replace(/\bNAME_LEARNED:\s*[A-Za-z][A-Za-z'\- ]{0,40}/gi, "")
                .replace(/\b(ARNED|NAME_LEARNED|BRAIN_LEARNED|LEARNED)\b:?\s*[^\n]{0,50}/gi, "")
                .trim();

              // Check for ORDER_CONFIRMED
              const orderMatch = fullReply.match(/ORDER_CONFIRMED:?\s*\{[\s\S]*?\}/i);
              let orderCreated = null;

              if (orderMatch) {
                fullReply = fullReply.replace(/ORDER_CONFIRMED:?\s*\{[\s\S]*?\}/gi, "").replace(/\n{3,}/g, "\n\n").trim();
              }

              send({ type: "done", reply: fullReply, agentName, orderCreated });
              controller.close();
              return;
            }
          } catch (e: any) {
            console.warn("[chat-stream] Z.ai streaming failed:", e?.message?.slice(0, 150));
          }
        }

        // Fallback: Cloudflare streaming
        if (!streamed && CLOUDFLARE_API_TOKEN && CLOUDFLARE_ACCOUNT_ID) {
          try {
            const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`;
            const response = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
              },
              body: JSON.stringify({
                messages: chatMessages,
                temperature: 0.85,
                max_tokens: 700,
                stream: true,
              }),
            });

            if (response.ok && response.body) {
              streamed = true;
              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              let buffer = "";

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    const data = line.slice(6).trim();
                    if (data === "[DONE]") continue;
                    try {
                      const parsed = JSON.parse(data);
                      const chunk = parsed.choices?.[0]?.delta?.content;
                      if (chunk) {
                        fullReply += chunk;
                        send({ type: "chunk", text: chunk });
                      }
                    } catch {}
                  }
                }
              }

              fullReply = fullReply
                .replace(/ORDER_CONFIRMED:?\s*\{[\s\S]*?\}/gi, "")
                .replace(/^NAME_LEARNED:.+$/gim, "")
                .replace(/\b(ARNED|NAME_LEARNED|BRAIN_LEARNED|LEARNED)\b:?\s*[^\n]{0,50}/gi, "")
                .trim();

              send({ type: "done", reply: fullReply, agentName, orderCreated: null });
              controller.close();
              return;
            }
          } catch (e: any) {
            console.warn("[chat-stream] Cloudflare streaming failed:", e?.message?.slice(0, 150));
          }
        }

        // Final fallback: tell frontend to use non-streaming endpoint
        if (!streamed) {
          send({ type: "fallback", message: "Streaming not available" });
          send({ type: "done", reply: "", agentName, orderCreated: null, fallback: true });
          controller.close();
          return;
        }
      } catch (e: any) {
        console.error("[chat-stream] error:", e?.message);
        send({ type: "error", error: "Something went wrong. Please try again." });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
    },
  });
}
