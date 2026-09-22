/**
 * POST /api/subscription/initiate
 *   { plan: "ANNUAL" | "MONTHLY", promoCode?: string }
 *
 * Initiates a Paystack transaction for the selected plan.
 * Returns the authorization URL the customer is redirected to.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDatabase } from "@/lib/db";
import { PRICING, initializeTransaction, validatePromoCode, getOrCreateSubscription } from "@/lib/paystack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDatabase();
  const businessId = session.user.businessId;
  const userEmail = session.user.email ?? "owner@ares.dev";

  try {
    const body = await req.json();
    const { plan, promoCode } = body as { plan?: string; promoCode?: string };

    if (!plan || !["ANNUAL", "MONTHLY"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Determine amount
    let amount: number;
    let finalPlan = plan;
    let promoApplied = false;

    if (promoCode) {
      const promo = validatePromoCode(promoCode);
      if (promo.valid) {
        amount = promo.amount;
        finalPlan = promo.plan;
        promoApplied = true;
      } else {
        return NextResponse.json({ error: "Invalid promo code" }, { status: 400 });
      }
    } else {
      amount = plan === "ANNUAL" ? PRICING.ANNUAL.amount : PRICING.MONTHLY.amount;
    }

    // Generate a unique reference
    const reference = `ARES-${businessId.slice(-8)}-${Date.now()}`;

    // Get the app URL for the callback
    const appUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "https://ares-two-eta.vercel.app";
    const callbackUrl = `${appUrl}/api/subscription/verify?reference=${reference}`;

    // Initialize the transaction
    const result = await initializeTransaction({
      email: userEmail,
      amount,
      reference,
      callbackUrl,
      metadata: {
        businessId,
        plan: finalPlan,
        promoCode: promoApplied ? promoCode : undefined,
        custom_fields: [
          { display_name: "Business", variable_name: "business", value: session.user.businessName ?? "" },
          { display_name: "Plan", variable_name: "plan", value: finalPlan },
          { display_name: "Promo", variable_name: "promo", value: promoApplied ? promoCode : "None" },
        ],
      },
    });

    if (!result) {
      return NextResponse.json({ error: "Failed to initialize payment. Check Paystack configuration." }, { status: 500 });
    }

    return NextResponse.json({
      authorization_url: result.authorization_url,
      reference: result.reference,
      amount,
      plan: finalPlan,
      promoApplied,
    });
  } catch (e: any) {
    console.error("[subscription/initiate] error:", e?.message);
    return NextResponse.json({ error: "Failed to initiate payment" }, { status: 500 });
  }
}
