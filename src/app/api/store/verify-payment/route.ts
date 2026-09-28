/**
 * POST /api/store/verify-payment
 *   { slug, sessionId, imageBase64, orderCode }
 *
 * Receives a payment screenshot, sends it to the VLM (Vision Language Model)
 * for analysis. Checks:
 * 1. Does the image contain a payment confirmation (not a random photo)?
 * 2. Does it contain the order code?
 * 3. Does it contain a payment amount?
 * 4. Is the payment recent (today's date)?
 *
 * If all checks pass → marks the order as CONFIRMED (paid).
 * If any check fails → flags the payment as suspicious.
 */
import { NextRequest, NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { getZaiClient } from "@/lib/ai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    await ensureDatabase();
    const body = await req.json();
    const { slug, sessionId, imageBase64, orderCode } = body as {
      slug?: string; sessionId?: string; imageBase64?: string; orderCode?: string;
    };

    if (!slug || !imageBase64) {
      return NextResponse.json({ error: "slug and imageBase64 are required" }, { status: 400 });
    }

    // Find the business
    const business = await db.business.findUnique({
      where: { slug },
      select: { id: true, name: true, currency: true },
    });
    if (!business) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Find the most recent order with this order code
    let order: any = null;
    if (orderCode) {
      const orders = await db.order.findMany({
        where: { businessId: business.id, status: "PENDING" },
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      order = orders.find((o) => (o.notes ?? "").toUpperCase().includes(orderCode.toUpperCase()));
    } else if (sessionId) {
      // No code given — find the most recent pending order from this session's conversations
      const convos = await db.conversation.findMany({
        where: { businessId: business.id, externalId: sessionId, channel: "WEB" },
        orderBy: { lastMessageAt: "desc" },
        take: 1,
      });
      if (convos.length > 0) {
        const recentOrders = await db.order.findMany({
          where: { businessId: business.id, status: "PENDING", customerName: convos[0].customerName ?? undefined },
          include: { items: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        });
        if (recentOrders.length > 0) order = recentOrders[0];
      }
    }

    if (!order) {
      return NextResponse.json({
        verified: false,
        reason: "I couldn't find an order matching that code. Please double-check your order code and try again.",
      });
    }

    // Extract the order code and total from the order
    const expectedCode = (order.notes ?? "").replace("Order code: ", "").trim();
    const expectedAmount = order.total;
    const currency = order.currency || business.currency;

    // Send the image to the VLM for analysis
    let analysis = "";
    try {
      const zai = await getZaiClient();
      const visionRes = await (zai as any).chat.completions.createVision({
        model: "glm-4v",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are a payment verification agent. Analyze this screenshot and answer these questions:
1. Is this a payment/money transfer confirmation screenshot? (YES/NO)
2. What is the payment amount shown? (or "NOT FOUND")
3. What is the reference/note/code shown? (or "NOT FOUND")
4. What date is shown? (or "NOT FOUND")

Expected order code: ${expectedCode}
Expected amount: ${currency} ${expectedAmount.toFixed(2)}

Answer in this exact format:
IS_PAYMENT: YES/NO
AMOUNT: <amount or NOT FOUND>
REFERENCE: <reference or NOT FOUND>
DATE: <date or NOT FOUND>
MATCHES_CODE: YES/NO (does the reference contain or match "${expectedCode}"?)
MATCHES_AMOUNT: YES/NO (is the amount close to ${expectedAmount.toFixed(2)}?)

Be strict. If it's a photo of something else (not a payment screenshot), say IS_PAYMENT: NO.`,
              },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
      });
      analysis = (visionRes as any)?.choices?.[0]?.message?.content?.toString().trim() ?? "";
    } catch (e: any) {
      console.error("[verify-payment] VLM failed:", e?.message);
      return NextResponse.json({
        verified: false,
        reason: "I couldn't analyze the screenshot. Please try uploading it again, or contact the store directly.",
      });
    }

    // Parse the VLM response
    const isPayment = /IS_PAYMENT:\s*YES/i.test(analysis);
    const matchesCode = /MATCHES_CODE:\s*YES/i.test(analysis);
    const matchesAmount = /MATCHES_AMOUNT:\s*YES/i.test(analysis);

    if (!isPayment) {
      return NextResponse.json({
        verified: false,
        reason: "This doesn't look like a payment screenshot. Please upload a screenshot of your actual payment confirmation from your mobile money or banking app.",
        analysis,
      });
    }

    if (!matchesCode) {
      return NextResponse.json({
        verified: false,
        reason: `I couldn't find your order code "${expectedCode}" in this screenshot. Please make sure you used "${expectedCode}" as your payment reference and upload the screenshot again.`,
        analysis,
      });
    }

    if (!matchesAmount) {
      return NextResponse.json({
        verified: false,
        reason: `The amount in this screenshot doesn't match your order total of ${currency} ${expectedAmount.toFixed(2)}. Please check and try again.`,
        analysis,
      });
    }

    // All checks passed — mark the order as CONFIRMED (paid)
    await db.order.update({
      where: { id: order.id },
      data: { status: "CONFIRMED" },
    });

    // Audit log
    try {
      await db.auditLog.create({
        data: {
          businessId: business.id,
          actorType: "SYSTEM",
          actorName: "Payment Verification",
          action: "PAYMENT_VERIFIED",
          tool: "store.vlm_verify",
          target: order.id,
          result: "SUCCESS",
          riskLevel: "HIGH",
          details: JSON.stringify({ orderCode: expectedCode, amount: expectedAmount, analysis: analysis.slice(0, 200) }),
        },
      });
    } catch {}

    return NextResponse.json({
      verified: true,
      orderCode: expectedCode,
      amount: expectedAmount,
      currency,
      reason: `Payment verified! Your order ${expectedCode} for ${currency} ${expectedAmount.toFixed(2)} has been marked as paid. We'll get that ready for you! 🎉`,
    });
  } catch (e: any) {
    console.error("[verify-payment] error:", e?.message);
    return NextResponse.json({
      verified: false,
      reason: "Something went wrong verifying your payment. Please try again.",
    });
  }
}
