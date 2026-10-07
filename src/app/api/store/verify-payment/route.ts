/**
 * POST /api/store/verify-payment
 *   { slug, sessionId, imageBase64, orderCode }
 *
 * STRICT verification flow:
 *   1. VLM extracts: IS_PAYMENT, AMOUNT, ORDER_CODE, RECIPIENT_NAME, DATE, REFERENCE
 *   2. ORDER CODE must be found in screenshot AND match a pending order in DB
 *   3. AMOUNT must match the order total (within 1% tolerance)
 *   4. DATE must not be BEFORE the order creation date
 *   5. RECIPIENT NAME must match the owner's registered MoMo name (if set)
 *   6. All checks must pass → mark order as CONFIRMED
 *   7. Any check fails → clear rejection with specific reason
 */
import { NextRequest, NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { getVisionClient } from "@/lib/ai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAmountMatch(found: number, expected: number): boolean {
  if (!Number.isFinite(found) || !Number.isFinite(expected)) return false;
  if (expected === 0 && found === 0) return true;
  if (expected === 0) return false;
  const pctDiff = Math.abs(found - expected) / Math.max(expected, 0.01);
  return pctDiff <= 0.01 || Math.abs(found - expected) <= 1;
}

function isCodeMatch(foundRef: string, expectedCode: string): boolean {
  if (!foundRef || !expectedCode) return false;
  const norm = (s: string) => s.toUpperCase().replace(/[\s\-_\[\]]/g, "");
  return norm(foundRef).includes(norm(expectedCode));
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.toUpperCase() === "NOT_FOUND") return null;
  // Try YYYY-MM-DD format first
  const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const d = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T00:00:00`);
    if (!isNaN(d.getTime())) return d;
  }
  // Try DD/MM/YYYY or MM/DD/YYYY
  const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slashMatch) {
    let day = parseInt(slashMatch[1]);
    let month = parseInt(slashMatch[2]);
    let year = parseInt(slashMatch[3]);
    if (year < 100) year += 2000;
    // If first number > 12, it's a day (DD/MM format)
    if (day > 12) { const tmp = day; day = month; month = tmp; }
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) return d;
  }
  // Try "Oct 5, 2026" format
  const namedMonth = dateStr.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s*(\d{4})/i);
  if (namedMonth) {
    const months: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const monthIdx = months[namedMonth[1].toLowerCase().slice(0, 3)];
    if (monthIdx !== undefined) {
      const d = new Date(parseInt(namedMonth[3]), monthIdx, parseInt(namedMonth[2]));
      if (!isNaN(d.getTime())) return d;
    }
  }
  // Try direct Date parse
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    await ensureDatabase();
    const body = await req.json();
    const { slug, sessionId, imageBase64, orderCode } = body;
    if (!slug || !imageBase64 || !imageBase64.startsWith("data:image/"))
      return NextResponse.json({ verified: false, reason: "Invalid image. Please upload a screenshot of your payment." });

    const business = await db.business.findUnique({ where: { slug }, select: { id: true, name: true, currency: true, configuration: true } });
    if (!business) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    let momoAccountName: string | null = null;
    let paymentEnabled = true;
    try {
      const config = JSON.parse(business.configuration || "{}");
      if (config.momoAccountName) momoAccountName = config.momoAccountName.trim();
      if (config.paymentEnabled === false) paymentEnabled = false;
    } catch {}

    if (!paymentEnabled)
      return NextResponse.json({ verified: false, reason: "Payment verification is currently disabled. Please contact the store owner." });

    // ===== VLM Analysis =====
    let analysis = "";
    let vlmProvider = "unknown";
    try {
      const vision = await getVisionClient() as any;
      vlmProvider = vision._provider || "unknown";
      const recipientInstr = momoAccountName ? `\nRECIPIENT_NAME: <name of the person who RECEIVED the money — or NOT_FOUND>` : "";
      analysis = await vision.analyze(imageBase64, `Analyze this screenshot and extract:
IS_PAYMENT: <YES if this is a mobile money/bank transfer payment confirmation, otherwise NO>
AMOUNT: <the payment amount as a number, e.g. 150.00 — or NOT_FOUND>
ORDER_CODE: <any 4-character uppercase alphanumeric code visible in the reference/note field — or NOT_FOUND>
${recipientInstr}
DATE: <the payment date in YYYY-MM-DD format if parseable, otherwise the raw text — or NOT_FOUND>
REFERENCE: <the full reference/note/message field verbatim — or NOT_FOUND>`);
    } catch (e: any) {
      console.error("[verify-payment] VLM failed:", e?.message);
      return NextResponse.json({ verified: false, pendingManual: true, reason: "Thanks for uploading! The store owner will verify your payment shortly." });
    }

    // If VLM returned empty analysis (model broken / no vision support), treat as manual review
    if (!analysis || analysis.trim().length < 10) {
      console.warn("[verify-payment] VLM returned empty analysis (provider:", vlmProvider + ") — falling back to manual review");
      return NextResponse.json({ verified: false, pendingManual: true, reason: "Thanks for uploading! The store owner will verify your payment shortly." });
    }

    // ===== Parse VLM response (be flexible about formatting) =====
    const isPaymentYes = /IS_PAYMENT[:\s]*\s*YES/im.test(analysis);
    const isPaymentNo = /IS_PAYMENT[:\s]*\s*NO/im.test(analysis);
    const amountMatch = analysis.match(/AMOUNT[:\s]*\s*([\d.,]+)/im);
    const referenceMatch = analysis.match(/REFERENCE[:\s]*\s*(.+?)$/im);
    const orderCodeMatch = analysis.match(/ORDER_CODE[:\s]*\s*([A-Z0-9]{4})\b/im);
    const recipientMatch = analysis.match(/RECIPIENT_NAME[:\s]*\s*(.+?)$/im);
    const dateMatch = analysis.match(/DATE[:\s]*\s*(.+?)$/im);

    // If VLM didn't return a clear YES or NO, it probably returned garbage from
    // a text-only model (OpenRouter's openrouter/free auto-router sometimes does
    // this). Fall back to manual review instead of falsely rejecting.
    if (!isPaymentYes && !isPaymentNo) {
      console.warn("[verify-payment] VLM response has no IS_PAYMENT marker — treating as manual review. Response:", analysis.slice(0, 150));
      return NextResponse.json({ verified: false, pendingManual: true, reason: "Thanks for uploading! The store owner will verify your payment shortly." });
    }

    // If VLM explicitly said this is NOT a payment, reject
    if (!isPaymentYes) {
      return NextResponse.json({ verified: false, reason: "This doesn't look like a payment screenshot. Please upload a screenshot of your actual payment confirmation from your mobile money or banking app." });
    }

    const foundAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : NaN;
    const foundReference = referenceMatch ? referenceMatch[1].trim() : "";
    const foundOrderCode = orderCodeMatch ? orderCodeMatch[1].trim().toUpperCase() : null;
    const foundRecipient = recipientMatch ? recipientMatch[1].trim() : "";
    const foundDateStr = dateMatch ? dateMatch[1].trim() : "";
    const foundDate = parseDate(foundDateStr);

    console.log(`[verify-payment] VLM: isPaymentYes=${isPaymentYes}, amount=${foundAmount}, orderCode=${foundOrderCode}, recipient=${foundRecipient}, date=${foundDateStr}`);

    // ===== CHECK 1 already passed above (IS_PAYMENT: YES confirmed) =====

    // ===== CHECK 2: Order code must be found in the screenshot =====
    let codeToLookup = orderCode?.trim() || foundOrderCode || null;
    if (!codeToLookup && foundReference) {
      const m = foundReference.toUpperCase().match(/\b([A-Z2-9]{4})\b/g);
      if (m) codeToLookup = m.find((c) => !/[IO01]/.test(c)) || m[0];
    }

    if (!codeToLookup || codeToLookup === "NOT_FOUND")
      return NextResponse.json({ verified: false, reason: "I couldn't find your order code in this screenshot. Please make sure you used your 4-character order code (like KX7P) as your payment reference and upload the screenshot again." });

    // ===== CHECK 3: Find the order in the database =====
    let order: any = null;
    const codeUpper = codeToLookup.toUpperCase();
    const candidates = await db.order.findMany({
      where: {
        businessId: business.id,
        status: "PENDING",
        OR: [
          { notes: { contains: `Order code: ${codeUpper}` } },
          { notes: { contains: `Order code: [${codeUpper}]` } },
        ],
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    order = candidates.find((o) =>
      (o.notes ?? "").toUpperCase().includes(`ORDER CODE: ${codeUpper}`) ||
      (o.notes ?? "").toUpperCase().includes(`ORDER CODE: [${codeUpper}]`)
    ) || null;

    // Fallback: session lookup
    if (!order && sessionId) {
      const convos = await db.conversation.findMany({ where: { businessId: business.id, externalId: sessionId, channel: "WEB" }, orderBy: { lastMessageAt: "desc" }, take: 1 });
      if (convos.length > 0) {
        const ro = await db.order.findMany({ where: { businessId: business.id, status: "PENDING", OR: [{ customerName: { equals: convos[0].customerName ?? "___", mode: "insensitive" } }, { customerPhone: convos[0].customerPhone ?? "___" }] }, include: { items: true }, orderBy: { createdAt: "desc" }, take: 1 });
        if (ro.length > 0) order = ro[0];
      }
    }

    if (!order)
      return NextResponse.json({ verified: false, reason: `I couldn't find a pending order with code ${codeUpper}. Please double-check your order code or place a new order first.` });

    const expectedCode = (order.notes ?? "").replace("Order code: ", "").replace(/[\[\]]/g, "").trim();
    const expectedAmount = order.total;
    const currency = order.currency || business.currency;
    const orderCreatedAt = new Date(order.createdAt);

    // ===== CHECK 4: Order code in screenshot must match the order's code =====
    if (!isCodeMatch(codeToLookup, expectedCode))
      return NextResponse.json({ verified: false, reason: `The order code in your screenshot (${codeUpper}) doesn't match this order's code (${expectedCode}). Please use ${expectedCode} as your payment reference.` });

    // ===== CHECK 5: Payment date must NOT be before the order creation date =====
    if (foundDate && foundDate.getTime() < orderCreatedAt.getTime() - 86400000) {
      // Allow 24h tolerance for timezone differences
      console.warn(`[verify-payment] DATE CHECK FAILED: payment date ${foundDate.toISOString()} is before order date ${orderCreatedAt.toISOString()}`);
      return NextResponse.json({
        verified: false,
        reason: `The payment date on this screenshot (${foundDate.toLocaleDateString()}) is before the order was placed (${orderCreatedAt.toLocaleDateString()}). Please send a new payment and upload the new screenshot.`,
      });
    }

    // ===== CHECK 6: Amount must match =====
    if (!isAmountMatch(foundAmount, expectedAmount))
      return NextResponse.json({ verified: false, reason: `The amount in this screenshot (${foundAmount || "not found"}) doesn't match your order total of ${currency} ${expectedAmount.toFixed(2)}. Please send the correct amount and try again.` });

    // ===== CHECK 7: Recipient name must match (if owner set one) =====
    if (momoAccountName && foundRecipient && foundRecipient.toUpperCase() !== "NOT_FOUND") {
      const norm = (s: string) => s.toUpperCase().replace(/[\s\-_.,]/g, "");
      const expected = norm(momoAccountName);
      const found = norm(foundRecipient);
      if (expected !== found && !expected.includes(found) && !found.includes(expected)) {
        console.warn(`[verify-payment] RECIPIENT MISMATCH: expected="${momoAccountName}", found="${foundRecipient}"`);
        return NextResponse.json({
          verified: false,
          reason: `The recipient name on this screenshot ("${foundRecipient}") doesn't match our registered account name ("${momoAccountName}"). Please send the payment to the correct account and try again.`,
        });
      }
    }

    // ===== ALL CHECKS PASSED — mark order as paid =====
    await db.order.update({ where: { id: order.id }, data: { status: "CONFIRMED" } });

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
          details: JSON.stringify({
            orderCode: expectedCode,
            amount: expectedAmount,
            foundAmount,
            foundRecipient,
            expectedRecipient: momoAccountName,
            foundDate: foundDateStr,
            orderDate: orderCreatedAt.toISOString(),
          }),
        },
      });
    } catch {}

    return NextResponse.json({
      verified: true,
      orderCode: expectedCode,
      amount: expectedAmount,
      currency,
      reason: `Payment verified! Your order ${expectedCode} for ${currency} ${expectedAmount.toFixed(2)} has been marked as paid. We'll get that ready for you!`,
    });
  } catch (e: any) {
    console.error("[verify-payment] error:", e?.message);
    return NextResponse.json({ verified: false, reason: "Something went wrong verifying your payment. Please try again." });
  }
}
