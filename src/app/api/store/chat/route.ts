import { NextRequest, NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { buildStoreChatContext } from "@/lib/store-chat-context";
import { getChatClientWithFallback as getChatClient } from "@/lib/ai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ChatTurn { role: "user" | "assistant" | "system"; content: string; }

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try { await ensureDatabase(); } catch {}
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }
  const { slug, message, sessionId, history = [], customerName, customerPhone } = body as { slug?: string; message?: string; sessionId?: string; history?: ChatTurn[]; customerName?: string; customerPhone?: string; };
  if (!slug || !message) return NextResponse.json({ error: "slug and message are required" }, { status: 400 });

  let business: any = null;
  try { business = await db.business.findUnique({ where: { slug }, select: { id: true, name: true, currency: true, agentName: true, createdAt: true, configuration: true } }); } catch { return NextResponse.json({ reply: "I'm having trouble connecting right now.", conversationId: null, orderCreated: null, images: [] }); }
  if (!business) return NextResponse.json({ error: "Store not found" }, { status: 404 });
  const businessId = business.id;

  let paymentInfo = ""; let paymentEnabled = true; let momoAccountName = "";
  try { const config = JSON.parse(business.configuration || "{}"); if (config.paymentInfo) paymentInfo = config.paymentInfo; if (config.paymentEnabled === false) paymentEnabled = false; if (config.momoAccountName) momoAccountName = config.momoAccountName.trim(); } catch {}

  const businessAge = business.createdAt ? Date.now() - new Date(business.createdAt).getTime() : 0;
  const isOlderThan7Days = businessAge > 7 * 24 * 60 * 60 * 1000;
  let chatLocked = false;
  try { const { getOrCreateSubscription, hasAccess } = await import("@/lib/paystack"); const sub = await getOrCreateSubscription(businessId, db); if (!hasAccess(sub)) chatLocked = true; if (isOlderThan7Days) { const hasValidSub = sub && (sub.status === "ACTIVE" || (sub.status === "TRIAL" && sub.trialEndsAt && new Date(sub.trialEndsAt) > new Date())); if (!hasValidSub) chatLocked = true; } if (!sub && isOlderThan7Days) chatLocked = true; } catch { if (isOlderThan7Days) chatLocked = true; }
  if (chatLocked) return NextResponse.json({ reply: `${business.name} is temporarily unavailable.`, conversationId: null, orderCreated: null, images: [], locked: true });

  // Check if business is suspended by CEO
  if (business.status === "SUSPENDED") return NextResponse.json({ reply: `${business.name} is currently unavailable.`, conversationId: null, orderCreated: null, images: [], locked: true });

  let systemPrompt = `You are ${business.agentName || "the assistant"} at ${business.name}.`;
  let agentName = business.agentName || "Assistant";
  let contextProducts: any[] = [];
  const PLACEHOLDER_NAME_RE = /^\d+(st|nd|rd|th)\s+Customer$/i;

  const [ctxResult, prevConvoResult] = await Promise.allSettled([
    buildStoreChatContext(businessId),
    sessionId ? db.conversation.findFirst({ where: { businessId, externalId: sessionId, channel: "WEB", customerName: { not: null }, NOT: { customerName: { contains: "Customer" } } }, select: { customerName: true }, orderBy: { lastMessageAt: "desc" } }) : Promise.resolve(null),
  ]);
  if (ctxResult.status === "fulfilled" && ctxResult.value) { systemPrompt = ctxResult.value.systemPrompt; agentName = ctxResult.value.agentName; contextProducts = ctxResult.value.products; }

  let returningCustomerName: string | null = null;
  if (prevConvoResult.status === "fulfilled" && prevConvoResult.value?.customerName) { const candidate = prevConvoResult.value.customerName.trim(); if (candidate && !PLACEHOLDER_NAME_RE.test(candidate) && candidate.toLowerCase() !== "store customer") returningCustomerName = candidate; }
  if (returningCustomerName) systemPrompt += `\n\nRETURNING CUSTOMER: This customer's name is ${returningCustomerName}. Greet them by name. Don't ask for their name again.`;

  const historyLen = (history || []).length;
  const isFirstMessage = historyLen === 0;
  if (isFirstMessage) systemPrompt += `\n\nCONVERSATION STATE: FIRST message. Greet + ask for name.`;
  else systemPrompt += `\n\nCONVERSATION STATE: NOT first message. DO NOT greet again. Continue naturally.`;
  console.log(`[store chat] history: ${historyLen}, first: ${isFirstMessage}, returning: ${returningCustomerName || "none"}`);

  const messages: ChatTurn[] = [{ role: "system", content: systemPrompt }, ...(history || []).filter((m) => m && m.role && m.content).slice(-100).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })), { role: "user", content: message }];

  let reply = "";
  try { const client = await getChatClient(); const completion = await client.chat.completions.create({ messages, temperature: 0.85, max_tokens: 600 }); reply = (completion as any)?.choices?.[0]?.message?.content ?? ""; } catch (e: any) { console.error("[store chat] AI failed:", e?.message); try { const { getZaiClient } = await import("@/lib/ai-client"); const zai = await getZaiClient(); const completion = await zai.chat.completions.create({ messages, temperature: 0.85, max_tokens: 600 }); reply = (completion as any)?.choices?.[0]?.message?.content ?? ""; } catch { reply = `Sorry about that — the network seems a bit slow right now. Could you send that again?`; } }
  if (!reply?.trim()) reply = `Sorry, the network seems to be acting up. Could you try sending that again?`;

  // Strip markers
  reply = reply.replace(/^LEARNED:\s*.+$/gim, "").replace(/^BRAIN_LEARNED:\s*.+$/gim, "").replace(/^NAME_LEARNED:\s*.+$/gim, "").trim();
  reply = reply.replace(/\bNAME_LEARNED:\s*[A-Za-z][A-Za-z'\- ]{0,40}/gi, "").trim();
  reply = reply.replace(/\bLEARNED:\s*[^\n]{1,200}/gi, "").replace(/\bBRAIN_LEARNED:\s*[^\n]{1,200}/gi, "").trim();
  reply = reply.replace(/\b(ARNED|NAME_LEARNED|BRAIN_LEARNED|LEARNED)\b:?\s*[^\n]{0,50}/gi, "").trim();

  // Strip thinking-out-loud
  const thinkingPatterns = [/\bWait,?\s/gi, /\bActually,?\s/gi, /\bHmm,?\s/gi, /\bLet me think/gi, /\bLet me check/gi, /\bLooking at (?:the )?(?:instructions|prompt|context|rules)/gi, /\bThe customer provided/gi, /\bThe instruction says/gi, /\bI should (?:probably|likely)?\s/gi, /\bThis could be/gi, /\bHowever,?\s/gi, /\bBut I already/gi, /\bBut they just/gi];
  for (const p of thinkingPatterns) { const m = reply.match(p); if (m?.index !== undefined && m.index > 50) { reply = reply.slice(0, m.index).trim(); } }

  // Greeting bug recovery
  const replyIsGreeting = /^\s*(hi!?\s+i'?m|hey!?\s+i'?m|how can i help|how may i help|what can i do|welcome to)/i.test(reply.trim());
  if (!isFirstMessage && replyIsGreeting) {
    console.warn(`[store chat] GREETING BUG — re-calling with history`);
    try { const conv = (history || []).slice(-10).map((m) => `${m.role === "user" ? "Customer" : agentName}: ${m.content}`).join("\n"); const { getChatClient } = await import("@/lib/ai-client"); const rc = await getChatClient(); const rcomp = await rc.chat.completions.create({ messages: [{ role: "system", content: "Never greet on non-first messages." }, { role: "user", content: `Conversation:\n${conv}\n\nCustomer: "${message}"\n\nRespond naturally (no greeting):` }], temperature: 0.7, max_tokens: 600 }); const rReply = (rcomp as any)?.choices?.[0]?.message?.content?.toString().trim() ?? ""; if (rReply.length > 10 && !/^\s*(hi!?\s+i'?m|how can i help)/i.test(rReply)) reply = rReply; } catch {}
  }

  // Name extraction
  let aiLearnedName: string | null = null;
  const nameLearnedMatch = reply.match(/NAME_LEARNED:\s*([A-Za-z][A-Za-z'\- ]{1,40})/);
  if (nameLearnedMatch?.[1]) { aiLearnedName = nameLearnedMatch[1].trim().split(/\s+/).slice(0, 2).join(" "); aiLearnedName = aiLearnedName.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" "); }

  let extractedName: string | null = null;
  const msg = message.trim();
  
  // Check context: did the AI just ask for the customer's name?
  const recentAIAsedForName = /\b(what'?s your name|what name|your name\?|name should i|what should i call)\b/i.test(
    (history || []).slice(-3).filter((m) => m.role === "assistant").map((m) => (typeof m.content === "string" ? m.content : "")).join(" \n ")
  );
  
  // ONLY extract names from EXPLICIT name-introduction phrases OR when the AI just asked for the name.
  // The AI's NAME_LEARNED marker is the PRIMARY name extraction mechanism.
  const nm1 = msg.match(/(?:my name is|i am called|call me|name'?s|the name is)\s+([a-z][a-z'\-]{1,20}(?:\s+[a-z][a-z'\-]{1,20})?)/i);
  if (nm1?.[1]) extractedName = nm1[1].trim().split(/\s+/).slice(0, 2).join(" ");
  
  // "I'm X" / "I am X" — but ONLY if X is a single word and NOT a stop word
  if (!extractedName) {
    const nm2 = msg.match(/^\s*(?:i'?m|im|i am)\s+([a-z][a-z'\-]{2,15})\s*(?:[,.!?.]|$)/i);
    if (nm2?.[1]) {
      const candidate = nm2[1].trim().toLowerCase();
      const stopWords = ["interested","going","looking","wanting","thinking","trying","ordering","buying","shopping","here","back","fine","good","great","okay","ready","sorry","happy","glad","just","not","sure","kinda","sorta","feeling","doing","coming","leaving","waiting","calling","texting","messaging","chatting","asking","hungry","tired","broke","busy","done","set","confused","worried","excited","available","down","up","in","out","off","on","away","there","here","late","early","new","old","young","cool","warm","hot","cold","sick","well","ok","alright","awesome","perfect","lovely","beautiful","nice","sweet","kind","mean","rude","polite","funny","serious","calm","quiet","loud","fast","slow","cheap","expensive","free","open","closed","full","empty","looking","for","the","a","an","yes","no","yeah","yep","nope","yh"];
      if (!stopWords.includes(candidate)) extractedName = nm2[1].trim();
    }
  }
  
  // "X here" / "X speaking"
  if (!extractedName) {
    const nm3 = msg.match(/^([a-z][a-z]{1,20})\s+(?:here|speaking)/i);
    if (nm3?.[1]) extractedName = nm3[1].trim();
  }
  
  // REMOVED: the fallback "match any ≤2 word message as a name" logic.
  // This was the root cause of "Large Size", "Blue Suit", "No Please"
  // being saved as customer names in the conversations list.
  
  if (extractedName) extractedName = extractedName.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  
  // AI-extracted name takes precedence (the AI understands context)
  if (aiLearnedName) extractedName = aiLearnedName;

  // Order detection
  let orderData: any = null; let orderUpdateData: any = null; let orderConfirmedDetected = false;
  const cleanedReplyForOrder = reply.replace(/```(?:json)?\s*([\s\S]*?)```/g, (_, code) => code).replace(/[\u201C\u201D]/g, '"');

  const prematureMatch = cleanedReplyForOrder.match(/ORDER_CONFIRMED:?\s*\{[\s\S]*?\}/i);
  const hasConfirmationQuestion = /\b(is this correct\??|shall i (?:confirm|proceed)\??|correct\??)\b/i.test(cleanedReplyForOrder);
  if (prematureMatch && hasConfirmationQuestion) { console.warn("[store chat] PREMATURE ORDER_CONFIRMED — stripping"); reply = reply.replace(/ORDER_CONFIRMED:?\s*\{[\s\S]*?\}/gi, "").replace(/\n{3,}/g, "\n\n").trim(); }
  else {
    const markerMatch = cleanedReplyForOrder.match(/ORDER_CONFIRMED:?\s*\{/i);
    if (markerMatch?.index !== undefined) {
      orderConfirmedDetected = true;
      const afterMarker = cleanedReplyForOrder.slice(markerMatch.index + markerMatch[0].length - 1);
      const jsonStr = extractBalancedJson(afterMarker);
      if (jsonStr) { try { orderData = JSON.parse(jsonStr); } catch { orderData = extractOrderFields(jsonStr); } }
      const markerInReply = reply.search(/ORDER_CONFIRMED:?\s*\{/i);
      if (markerInReply >= 0) { const afterMarkerInReply = reply.slice(markerInReply).replace(/^ORDER_CONFIRMED:?\s*/i, ""); const balancedInReply = extractBalancedJson(afterMarkerInReply); if (balancedInReply) { const prefixLen = reply.slice(markerInReply).match(/^ORDER_CONFIRMED:?\s*/i)?.[0].length ?? 0; const jsonOffset = afterMarkerInReply.indexOf(balancedInReply); const endPos = markerInReply + prefixLen + jsonOffset + balancedInReply.length; reply = (reply.slice(0, markerInReply) + reply.slice(endPos)).replace(/\n{3,}/g, "\n\n").trim(); } else reply = reply.slice(0, markerInReply).trim(); }
    }
  }

  if (orderConfirmedDetected && !orderData?.items?.length) { console.warn("[store chat] fallback AI extraction (ORDER_CONFIRMED detected but no items)"); try { orderData = await extractOrderFromConversation(history || [], message, agentName, business.name, contextProducts); } catch (e: any) { console.error("[store chat] fallback failed:", e?.message); } }

  // ===== MISSING ORDER_CONFIRMED DETECTION =====
  // If the AI did NOT emit ORDER_CONFIRMED, but the customer said "yes/yep/yh/correct"
  // to a recent "Is this correct?" question, the AI forgot to emit the marker.
  // Use the fallback extraction to get the order from conversation history.
  if (!orderData?.items?.length && !orderConfirmedDetected) {
    const customerSaidYes = /\b(yes|yeah|yh|yep|correct|that'?s right|that'?s correct|confirm|confirmed|ok|okay|sure|go ahead|proceed)\b/i.test(message.trim());
    const aiRecentlyAskedConfirmation = /\b(is this correct\??|shall i (?:confirm|proceed)\??|does that look right\??|correct\??)\b/i.test(
      (history || []).slice(-4).filter((m) => m.role === "assistant").map((m) => (typeof m.content === "string" ? m.content : "")).join(" \n ")
    );
    if (customerSaidYes && aiRecentlyAskedConfirmation) {
      console.warn("[store chat] MISSING ORDER_CONFIRMED — customer said yes to 'Is this correct?' but AI didn't emit marker. Using fallback extraction.");
      try {
        orderData = await extractOrderFromConversation(history || [], message, agentName, business.name, contextProducts);
        if (orderData?.items?.length > 0) {
          console.log(`[store chat] fallback extraction succeeded: ${orderData.items.length} items`);
        }
      } catch (e: any) { console.error("[store chat] missing-ORDER_CONFIRMED fallback failed:", e?.message); }
    }
  }

  const updateMatch = cleanedReplyForOrder.match(/ORDER_UPDATED:?\s*(\{[\s\S]*?\})/i);
  if (updateMatch) { try { let rawJson = extractBalancedJson(updateMatch[1]) || updateMatch[1]; try { orderUpdateData = JSON.parse(rawJson); } catch { orderUpdateData = extractOrderFields(rawJson); } } catch {} const um = reply.search(/ORDER_UPDATED:?\s*\{/i); if (um >= 0) { const am = reply.slice(um).replace(/^ORDER_UPDATED:?\s*/i, ""); const bu = extractBalancedJson(am); if (bu) { const pl = reply.slice(um).match(/^ORDER_UPDATED:?\s*/i)?.[0].length ?? 0; const jo = am.indexOf(bu); reply = (reply.slice(0, um) + reply.slice(um + pl + jo + bu.length)).replace(/\n{3,}/g, "\n\n").trim(); } else reply = reply.slice(0, um).trim(); } }

  reply = reply.replace(/\s*,?\s*"[a-zA-Z_]+"\s*:\s*(?:"[^"]*"|[\d.]+|true|false|null)\s*[,}]?\s*$/g, "").trim();
  reply = reply.replace(/\s*[\}\]]\s*$/g, "").trim();
  reply = reply.replace(/^\s*[\{\}",\]]\s*.*[\}\",\]]\s*$/gm, "").trim();
  reply = reply.replace(/\n{3,}/g, "\n\n").trim();

  if (orderData?.items?.length > 0) {
    const recentHistoryText = (history || []).slice(-8).map((m) => (typeof m.content === "string" ? m.content.toLowerCase() : "")).join(" \n ") + " \n " + message.toLowerCase();
    const msgLower = message.toLowerCase().trim();
    
    // Check if the CURRENT message is a "done" phrase — meaning the customer is done adding items
    // This checks the message DIRECTLY, not the concatenated history (which was buggy)
    const customerDonePhrases = /\b(that'?s all|that'?s it|nothing else|nothing more|just this|just these|that'?s everything|no more|nothing else to add|that'?s all i want|that'?s all for now|no nothing|nothing else thanks|just these items? please)\b/i;
    
    // Also check: does the message START with "no" or "nope" or "nothing"?
    // This catches: "no", "no please", "nope", "nothing", "no that's all", "no, just this"
    const startsWithNo = /^(no|nope|nothing)\b/i.test(msgLower);
    
    // Also check history for done phrases (in case the AI asked "anything else?" earlier)
    const historyHasDone = customerDonePhrases.test(recentHistoryText) || startsWithNo;
    
    const aiAskedAnythingElse = /\b(anything else|anything more|want to add|add anything|would you like to add|something else|add any other)\b/i.test((history || []).slice(-6).map((m) => (typeof m.content === "string" ? m.content.toLowerCase() : "")).join(" \n "));
    const customerConfirmedDone = historyHasDone;
    const recentOrderCodeGiven = /\b(your order code is|order code is|payment reference)\b/i.test((history || []).slice(-6).map((m) => (typeof m.content === "string" ? m.content : "")).join(" \n "));
    console.log(`[store chat] ORDER CHECK: items=${orderData.items.length}, msgLower="${msgLower}", startsWithNo=${startsWithNo}, done=${customerConfirmedDone}, asked=${aiAskedAnythingElse}, recentCode=${recentOrderCodeGiven}`);

    if (recentOrderCodeGiven || (orderData.items.length > 1) || (customerConfirmedDone && aiAskedAnythingElse)) {
      const orderCode = await generateUniqueOrderCode(businessId);
      orderData.orderCode = orderCode;
      try {
        const created = await createOrderFromChat(businessId, customerName || extractedName || orderData?.customerName || returningCustomerName || "Store customer", orderData, business.currency);
        if (created) { orderData.createdOrderId = created.id;
          if (paymentEnabled && paymentInfo) {
            const accountNameLine = momoAccountName ? `\nAccount Name: ${momoAccountName}` : "";
            reply += `\n\nYour order code is [${orderCode}]. Use this as your payment reference.\n\nPAYMENT METHODS\n${paymentInfo}${accountNameLine}\n\nSend a screenshot of your payment when you're done. We'll confirm once your payment comes through!`;
          } else {
            reply += `\n\nYour order code is [${orderCode}]. Your order has been placed! We'll get that ready for you.`;
          }
        }
        else { reply += "\n\nI had trouble logging your order. Please try again."; orderData = null; }
      } catch (e: any) { console.error("[store chat] ORDER CREATION FAILED:", e?.message); reply += "\n\nSorry, I couldn't log your order. Please try again."; orderData = null; }
    } else { reply += "\n\nBefore I confirm your order — would you like to add anything else?"; orderData = null; }
  }

  if (!orderData?.createdOrderId) {
    reply = reply.replace(/\b(your order (?:is|has been) (?:confirmed|logged|placed|received))[^.]*\.?/gi, "");
    reply = reply.replace(/\b(order (?:is|has been) (?:confirmed|logged|placed|received))[^.]*\.?/gi, "");
    reply = reply.replace(/\b(thank you for (?:your )?order)[^.]*\.?/gi, "");
    reply = reply.replace(/\bPAYMENT METHODS\b[\s\S]*?(?=\n\n|\n*$|$)/gi, "");
    reply = reply.replace(/\bSend a screenshot of your payment\b[\s\S]*?(?=\n\n|\n*$|$)/gi, "");
    reply = reply.replace(/\n{3,}/g, "\n\n").trim();
  }

  const mentionedImages: any[] = [];
  if (contextProducts.length > 0) { const replyLower = reply.toLowerCase(); for (const p of contextProducts) { if (p.imageUrl && p.name && replyLower.includes(p.name.toLowerCase())) { mentionedImages.push({ productId: p.id, name: p.name, imageUrl: p.imageUrl, price: p.price, currency: p.currency }); if (mentionedImages.length >= 3) break; } } }

  reply = reply.replace(/\b(NAME_LEARNED|LEARNED|BRAIN_LEARNED)\b:?\s*[^\n]*/gi, "").trim();
  reply = reply.replace(/\*\*(.+?)\*\*/g, "$1");
  reply = reply.replace(/`([^`\n]+?)`/g, "$1");
  reply = reply.replace(/^#{1,6}\s+/gm, "");
  reply = reply.replace(/\n{3,}/g, "\n\n").trim();

  console.log(`[store chat] ${Date.now() - startTime}ms`);
  const response = NextResponse.json({ reply, agentName, conversationId: null, orderCreated: orderData?.createdOrderId ? { id: orderData.createdOrderId, orderCode: orderData.orderCode } : null, orderUpdated: !!orderUpdateData, images: mentionedImages });

  backgroundPersist({ businessId, sessionId, message, reply, agentName, customerName: customerName || extractedName, customerPhone, extractedName, orderUpdateData, mentionedImages, business, returningCustomerName }).catch((e) => console.error("[store chat] bg failed:", e));
  return response;
}

async function backgroundPersist(opts: any) {
  const { businessId, sessionId, message, reply, agentName, customerName, customerPhone, extractedName, orderUpdateData, mentionedImages, business, returningCustomerName } = opts;
  const promises: Promise<any>[] = [];
  promises.push((async () => {
    try {
      let conversation = sessionId ? await db.conversation.findFirst({ where: { businessId, externalId: sessionId, channel: "WEB", status: "OPEN" } }) : null;
      if (!conversation) { const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0); const todayCount = await db.conversation.count({ where: { businessId, channel: "WEB", createdAt: { gte: startOfToday } } }); const customerNumber = todayCount + 1; const ordinal = customerNumber === 1 ? "1st" : customerNumber === 2 ? "2nd" : customerNumber === 3 ? "3rd" : `${customerNumber}th`; conversation = await db.conversation.create({ data: { businessId, channel: "WEB", externalId: sessionId, customerName: `${ordinal} Customer`, customerPhone: customerPhone || null, status: "OPEN" } }); }
      await db.message.create({ data: { conversationId: conversation.id, role: "CUSTOMER", content: message } });
      await db.message.create({ data: { conversationId: conversation.id, role: "AI", content: reply, metadata: JSON.stringify({ agentName, images: mentionedImages }) } });
      const nameToPersist = customerName || extractedName || returningCustomerName;
      const isPlaceholder = conversation.customerName && /^\d+(st|nd|rd|th)\s+Customer$/i.test(conversation.customerName);
      const nameChanged = extractedName && conversation.customerName && extractedName.toLowerCase() !== conversation.customerName.toLowerCase();
      // Only update the name if:
      //   - The current name is a placeholder ("1st Customer" etc.) OR
      //   - The current name is null/empty OR
      //   - The customer explicitly gave a DIFFERENT name (extractedName is set AND different from current)
      // AND the new name is NOT a generic placeholder itself
      const isGenericName = !nameToPersist || nameToPersist === "Store customer" || nameToPersist === "Unknown customer";
      if (nameToPersist && !isGenericName && (isPlaceholder || !conversation.customerName || nameChanged)) { await db.conversation.update({ where: { id: conversation.id }, data: { customerName: nameToPersist, customerPhone: customerPhone || conversation.customerPhone || null, lastMessageAt: new Date() } }); console.log(`[store chat bg] ${conversation.id} name: ${conversation.customerName} -> ${nameToPersist}`); } else await db.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });
    } catch (e) { console.error("[store chat bg] convo failed:", e); }
  })());
  if (extractedName) { promises.push((async () => { try { let customer = await db.customer.findFirst({ where: { businessId, name: { equals: extractedName, mode: "insensitive" } } }); if (!customer && customerPhone) customer = await db.customer.findFirst({ where: { businessId, phone: customerPhone } }); if (!customer) customer = await db.customer.create({ data: { businessId, name: extractedName, phone: customerPhone || null, whatsappId: customerPhone || null, status: "LEAD" } }); if (sessionId) { const convo = await db.conversation.findFirst({ where: { businessId, externalId: sessionId, channel: "WEB" }, orderBy: { lastMessageAt: "desc" } }); if (convo && !convo.customerId) await db.conversation.update({ where: { id: convo.id }, data: { customerId: customer.id } }); } } catch (e) { console.error("[store chat bg] customer failed:", e); } })()); }
  await Promise.allSettled(promises);
}

async function extractOrderFromConversation(history: ChatTurn[], currentMessage: string, agentName: string, businessName: string, products: any[]): Promise<any> {
  const conversationText = (history || []).slice(-15).map((m) => `${m.role === "user" ? "Customer" : agentName}: ${m.content}`).join("\n");
  const productList = products.map((p) => `${p.name} (${p.currency} ${p.price.toFixed(2)})`).join("\n");
  try { const { getChatClient } = await import("@/lib/ai-client"); const client = await getChatClient(); const completion = await client.chat.completions.create({ messages: [{ role: "system", content: "Output ONLY valid JSON." }, { role: "user", content: `Extract order as JSON.\n\nCONVERSATION:\n${conversationText}\n\nCustomer's latest: "${currentMessage}"\n\nPRODUCTS:\n${productList}\n\nOutput: {"items":[{"productName":"exact name","quantity":1,"unitPrice":0}],"fulfillmentType":"PICKUP","deliveryLocation":"","deliveryTime":"","deliveryPhone":"","customerName":""}` }], temperature: 0.1, max_tokens: 500 }); let extraction = (completion as any)?.choices?.[0]?.message?.content?.toString().trim() ?? ""; extraction = extraction.replace(/```(?:json)?\s*/gi, "").replace(/```/gi, "").trim(); const jsonStart = extraction.indexOf("{"); const jsonEnd = extraction.lastIndexOf("}"); if (jsonStart >= 0 && jsonEnd > jsonStart) { const orderData = JSON.parse(extraction.slice(jsonStart, jsonEnd + 1)); if (orderData.items && Array.isArray(orderData.items)) { for (const item of orderData.items) { const pn = String(item.productName || "").toLowerCase(); const mp = products.find((p) => p.name.toLowerCase() === pn || p.name.toLowerCase().includes(pn) || pn.includes(p.name.toLowerCase())); if (mp) { item.productName = mp.name; item.unitPrice = mp.price; } } orderData.items = orderData.items.filter((i: any) => i.unitPrice > 0); } return orderData; } return null; } catch { return null; }
}

async function generateUniqueOrderCode(businessId: string): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const crypto = await import("crypto");
  for (let i = 0; i < 5; i++) { const bytes = crypto.randomBytes(4); let code = ""; for (let j = 0; j < 4; j++) code += chars[bytes[j] % chars.length]; const existing = await db.order.findFirst({ where: { businessId, status: { in: ["PENDING", "CONFIRMED"] }, notes: { contains: `Order code: ${code}` } }, select: { id: true } }); if (!existing) return code; }
  const bytes = crypto.randomBytes(5); let code = ""; for (let i = 0; i < 5; i++) code += chars[bytes[i] % chars.length]; return code;
}

function extractBalancedJson(s: string): string | null {
  const start = s.indexOf("{"); if (start < 0) return null;
  let depth = 0, inString = false, escape = false;
  for (let i = start; i < s.length; i++) { const c = s[i]; if (escape) { escape = false; continue; } if (c === "\\" && inString) { escape = true; continue; } if (c === '"') { inString = !inString; continue; } if (inString) continue; if (c === "{") depth++; if (c === "}") { depth--; if (depth === 0) return s.slice(start, i + 1); } }
  return null;
}

async function createOrderFromChat(businessId: string, customerName: string, data: any, currency: string): Promise<{ id: string } | null> {
  const items = Array.isArray(data.items) ? data.items : []; if (items.length === 0) return null;
  let total = 0; const itemRows: any[] = [];
  for (const it of items) {
    const qty = Math.max(1, parseInt(String(it.quantity ?? 1), 10));
    let prod: any = null;
    if (it.productName) { const nameStr = String(it.productName).trim(); prod = await db.product.findFirst({ where: { businessId, name: { equals: nameStr, mode: "insensitive" } } }); if (!prod) prod = await db.product.findFirst({ where: { businessId, name: { contains: nameStr, mode: "insensitive" } } }); }
    let unit: number; if (prod && typeof prod.price === "number") unit = prod.price; else if (Number.isFinite(it.unitPrice) && it.unitPrice > 0) unit = it.unitPrice; else unit = 0;
    const lineTotal = unit * qty; total += lineTotal;
    itemRows.push({ name: it.productName || it.name || prod?.name || "Item", quantity: qty, unitPrice: unit, total: lineTotal, productId: prod?.id });
  }
  const resolvedName = data.customerName || customerName; const phone = data.customerPhone || data.deliveryPhone || null;
  let customerId: string | undefined;
  if (phone) { let c = await db.customer.findFirst({ where: { businessId, phone } }); if (!c) c = await db.customer.create({ data: { businessId, name: resolvedName, phone, whatsappId: phone, status: "ACTIVE" } }); customerId = c.id; await db.customer.update({ where: { id: customerId }, data: { lifetimeValue: { increment: total } } }); }
  else if (resolvedName && resolvedName !== "Store customer") { let c = await db.customer.findFirst({ where: { businessId, name: { equals: resolvedName, mode: "insensitive" } } }); if (!c) c = await db.customer.create({ data: { businessId, name: resolvedName, status: "ACTIVE" } }); customerId = c.id; await db.customer.update({ where: { id: customerId }, data: { lifetimeValue: { increment: total } } }); }
  const orderCode = data.orderCode || "????";
  console.log(`[createOrderFromChat] code=${orderCode}, items=${itemRows.length}, total=${total}, customer=${resolvedName}`);
  const created = await db.order.create({ data: { businessId, customerId, customerName: resolvedName, customerPhone: phone, status: "PENDING", channel: "WEB", total, currency, notes: `Order code: [${orderCode}]`, fulfillmentType: data.fulfillmentType === "DELIVERY" ? "DELIVERY" : "PICKUP", deliveryLocation: data.deliveryLocation ?? null, deliveryTime: data.deliveryTime ?? null, deliveryPhone: data.deliveryPhone ?? null, items: { create: itemRows } } });
  return created ? { id: created.id } : null;
}

function extractOrderFields(raw: string): any {
  const result: any = { items: [] };
  const fTypeMatch = raw.match(/"fulfillmentType"\s*:\s*"([^"]+)"/); if (fTypeMatch) result.fulfillmentType = fTypeMatch[1];
  const locMatch = raw.match(/"deliveryLocation"\s*:\s*"([^"]*)"/); if (locMatch) result.deliveryLocation = locMatch[1];
  const timeMatch = raw.match(/"deliveryTime"\s*:\s*"([^"]*)"/); if (timeMatch) result.deliveryTime = timeMatch[1];
  const dPhoneMatch = raw.match(/"deliveryPhone"\s*:\s*"([^"]*)"/); if (dPhoneMatch) result.deliveryPhone = dPhoneMatch[1];
  const cNameMatch = raw.match(/"customerName"\s*:\s*"([^"]*)"/); if (cNameMatch) result.customerName = cNameMatch[1];
  const itemMatches = [...raw.matchAll(/"productName"\s*:\s*"([^"]+)"/g)];
  const qtyMatches = [...raw.matchAll(/"quantity"\s*:\s*(\d+)/g)];
  const priceMatches = [...raw.matchAll(/"unitPrice"\s*:\s*([\d.]+)/g)];
  for (let i = 0; i < itemMatches.length; i++) { result.items.push({ productName: itemMatches[i][1], quantity: qtyMatches[i] ? parseInt(qtyMatches[i][1], 10) : 1, unitPrice: priceMatches[i] ? parseFloat(priceMatches[i][1]) : 0 }); }
  return result.items.length > 0 ? result : null;
}
