/**
 * GET /api/subscription/verify?reference=XXX
 *
 * Verifies a Paystack transaction and activates the subscription if successful.
 * This is the callback URL Paystack redirects to after payment.
 */
import { NextRequest, NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { verifyTransaction, getOrCreateSubscription } from "@/lib/paystack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await ensureDatabase();
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get("reference");

  if (!reference) {
    return NextResponse.redirect(new URL("/auth?payment=failed", req.url));
  }

  try {
    // Extract businessId from the reference (ARES-{businessId}-{timestamp})
    const parts = reference.split("-");
    if (parts.length < 3) {
      return NextResponse.redirect(new URL("/auth?payment=failed", req.url));
    }
    // The businessId suffix is parts[1], but the real businessId is longer.
    // We need to verify the transaction first, then find the business by the metadata.
    const verification = await verifyTransaction(reference);
    if (!verification || verification.status !== "success") {
      return NextResponse.redirect(new URL("/auth?payment=failed", req.url));
    }

    // The metadata contains the businessId — but verifyTransaction doesn't return it.
    // We need to re-query Paystack for the full transaction data to get metadata.
    // For now, we'll find the subscription by searching all businesses.
    // A better approach: store the reference in the Subscription table before redirect.

    // Since we can't easily get the businessId from the reference alone,
    // let's redirect to the auth page with the reference and let the frontend
    // call a POST endpoint that verifies using the session.
    return NextResponse.redirect(new URL(`/?payment=success&reference=${reference}`, req.url));
  } catch (e: any) {
    console.error("[subscription/verify] error:", e?.message);
    return NextResponse.redirect(new URL("/auth?payment=failed", req.url));
  }
}

/**
 * POST /api/subscription/verify
 *   { reference }
 *
 * Called by the frontend after the Paystack redirect.
 * Verifies the transaction using the session to identify the business.
 */
export async function POST(req: NextRequest) {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");

  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDatabase();
  const businessId = session.user.businessId;

  try {
    const body = await req.json();
    const { reference } = body as { reference?: string };

    if (!reference) {
      return NextResponse.json({ error: "Reference required" }, { status: 400 });
    }

    const verification = await verifyTransaction(reference);
    if (!verification || verification.status !== "success") {
      return NextResponse.json({ error: "Payment not successful" }, { status: 400 });
    }

    // Determine the plan based on the amount paid
    let plan = "ANNUAL";
    let periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

    if (verification.amount === 60000) {
      // Promo: GHC 600/year
      plan = "ANNUAL";
      periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    } else if (verification.amount === 130000) {
      // Standard annual: GHC 1300/year
      plan = "ANNUAL";
      periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    } else if (verification.amount === 11500) {
      // Monthly: GHC 115/month
      plan = "MONTHLY";
      periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    // Update or create the subscription
    const sub = await getOrCreateSubscription(businessId, db);
    if (sub) {
      await db.subscription.update({
        where: { id: sub.id },
        data: {
          status: "ACTIVE",
          plan,
          currentPeriodEnd: periodEnd,
          amountPaid: verification.amount / 100, // convert kobo to GHC
          paystackRef: reference,
        },
      });
    } else {
      await db.subscription.create({
        data: {
          businessId,
          status: "ACTIVE",
          plan,
          currentPeriodEnd: periodEnd,
          amountPaid: verification.amount / 100,
          paystackRef: reference,
        },
      });
    }

    // Audit log
    try {
      await db.auditLog.create({
        data: {
          businessId,
          actorType: "USER",
          actorName: session.user.name ?? "Owner",
          action: "SUBSCRIPTION_ACTIVATED",
          tool: "subscription.paystack",
          result: "SUCCESS",
          riskLevel: "HIGH",
          details: JSON.stringify({ plan, reference, amount: verification.amount }),
        },
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      plan,
      currentPeriodEnd: periodEnd.toISOString(),
    });
  } catch (e: any) {
    console.error("[subscription/verify POST] error:", e?.message);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
