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
                .replace(/\*\*(.+?)\*\*/g, "$1")
                .replace(/`([^`\n]+?)`/g, "$1")
                .replace(/^#{1,6}\s+/gm, "")
                .trim();

              // Check for ORDER_CONFIRMED — use balanced brace extraction
              const orderMarkerMatch = fullReply.match(/ORDER_CONFIRMED:?\s*\{/i);
              let orderCreated = null;

              if (orderMarkerMatch) {
                const markerStart = fullReply.search(/ORDER_CONFIRMED:?\s*\{/i);
                const afterMarker = fullReply.slice(markerStart).replace(/^ORDER_CONFIRMED:?\s*/i, "");

                // Extract balanced JSON (handles nested braces)
                let jsonStr: string | null = null;
                let braceCount = 0;
                let jsonStart = -1;
                for (let i = 0; i < afterMarker.length; i++) {
                  if (afterMarker[i] === "{") {
                    if (braceCount === 0) jsonStart = i;
                    braceCount++;
                  } else if (afterMarker[i] === "}") {
                    braceCount--;
                    if (braceCount === 0 && jsonStart >= 0) {
                      jsonStr = afterMarker.slice(jsonStart, i + 1);
                      break;
                    }
                  }
                }

                let orderData: any = null;
                if (jsonStr) {
                  try {
                    orderData = JSON.parse(jsonStr);
                  } catch {
                    console.warn("[chat-stream] Failed to parse ORDER_CONFIRMED JSON:", jsonStr.slice(0, 200));
                  }
                }

                // Strip the ORDER_CONFIRMED marker from the reply
                if (jsonStr) {
                  const fullMarker = fullReply.slice(markerStart, markerStart + afterMarker.indexOf(jsonStr) + jsonStr.length);
                  fullReply = fullReply.replace(fullMarker, "").replace(/\n{3,}/g, "\n\n").trim();
                } else {
                  // Fallback: strip everything from the marker to the end
                  fullReply = fullReply.slice(0, markerStart).trim();
                }

                // If we have order data with items, create the order
                if (orderData?.items?.length > 0) {
                  try {
                    // Generate unique order code
                    const orderCode = Math.random().toString(36).slice(2, 6).toUpperCase();

                    // Match items to actual products in the catalog
                    for (const item of orderData.items) {
                      const pn = String(item.productName || "").toLowerCase();
                      const mp = context.products.find((p: any) =>
                        p.name.toLowerCase() === pn ||
                        p.name.toLowerCase().includes(pn) ||
                        pn.includes(p.name.toLowerCase())
                      );
                      if (mp) {
                        item.productName = mp.name;
                        item.unitPrice = mp.price;
                      }
                    }
                    orderData.items = orderData.items.filter((i: any) => i.unitPrice > 0);

                    if (orderData.items.length > 0) {
                      // Create the order in the database
                      const total = orderData.items.reduce((s: number, i: any) => s + (i.unitPrice * i.quantity), 0);
                      const customerName = orderData.customerName || returningCustomerName || "Store customer";

                      const order = await db.order.create({
                        data: {
                          businessId,
                          customerName,
                          customerPhone: orderData.customerPhone || customerPhone || null,
                          status: "PENDING",
                          channel: "WEB",
                          total,
                          currency: business.currency,
                          notes: `Order code: ${orderCode}\nCustomer: ${customerName}\nFulfillment: ${orderData.fulfillmentType || "PICKUP"}`,
                          fulfillmentType: orderData.fulfillmentType || "PICKUP",
                          deliveryLocation: orderData.deliveryLocation || null,
                          deliveryTime: orderData.deliveryTime || null,
                          deliveryPhone: orderData.deliveryPhone || null,
                          items: {
                            create: orderData.items.map((i: any) => ({
                              name: i.productName,
                              quantity: i.quantity || 1,
                              unitPrice: i.unitPrice,
                              total: i.unitPrice * (i.quantity || 1),
                            })),
                          },
                        },
                      });

                      orderCreated = { id: order.id, orderCode };

                      // Append order code + payment info to the reply
                      let config: any = {};
                      try { config = JSON.parse(business.configuration || "{}"); } catch {}
                      const paymentInfo = config.paymentInfo || "";
                      const momoAccountName = config.momoAccountName || "";
                      const paymentEnabled = config.paymentEnabled !== false;

                      if (paymentEnabled && paymentInfo) {
                        const accountNameLine = momoAccountName ? `\nAccount Name: ${momoAccountName}` : "";
                        fullReply += `\n\nYour order code is [${orderCode}]. Use this as your payment reference.\n\nPAYMENT METHODS\n${paymentInfo}${accountNameLine}\n\nSend a screenshot of your payment when you're done. We'll confirm once your payment comes through!`;
                      } else {
                        fullReply += `\n\nYour order code is [${orderCode}]. Your order has been placed! We'll get that ready for you.`;
                      }
                    }
                  } catch (e: any) {
                    console.error("[chat-stream] Order creation failed:", e?.message);
                  }
                }
              }

              // Detect mentioned products and attach their images
              const mentionedImages: any[] = [];
              const replyLower = fullReply.toLowerCase();
              for (const p of context.products) {
                if (p.imageUrl && p.name && replyLower.includes(p.name.toLowerCase())) {
                  mentionedImages.push({
                    productId: p.id,
                    name: p.name,
                    imageUrl: p.imageUrl,
                    price: p.price,
                    currency: p.currency,
                  });
                  if (mentionedImages.length >= 3) break;
                }
              }

              send({ type: "done", reply: fullReply, agentName, orderCreated, images: mentionedImages });
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
                .replace(/\*\*(.+?)\*\*/g, "$1")
                .replace(/`([^`\n]+?)`/g, "$1")
                .replace(/^#{1,6}\s+/gm, "")
                .trim();

              // Detect mentioned products and attach their images
              const mentionedImages: any[] = [];
              const replyLower = fullReply.toLowerCase();
              for (const p of context.products) {
                if (p.imageUrl && p.name && replyLower.includes(p.name.toLowerCase())) {
                  mentionedImages.push({
                    productId: p.id,
                    name: p.name,
                    imageUrl: p.imageUrl,
                    price: p.price,
                    currency: p.currency,
                  });
                  if (mentionedImages.length >= 3) break;
                }
              }

              send({ type: "done", reply: fullReply, agentName, orderCreated: null, images: mentionedImages });
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
