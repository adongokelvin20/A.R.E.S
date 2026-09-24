/**
 * GET /api/subscription/initiate
 *   { plan: "ANNUAL" | "MONTHLY", promoCode?: string }
 *
 * Initiates a Paystack transaction for the selected plan.
 * Returns the authorization URL the customer is redirected to.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDatabase } from "@/lib/db";
import { PRICING, initializeTransaction, validatePromoCode, getOrCreateSubscription, getPaystackConfig, isPaystackConfigured } from "@/lib/paystack";

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
    let isFreePromo = false;

    if (promoCode) {
      const promo = validatePromoCode(promoCode);
      if (promo.valid) {
        amount = promo.amount;
        finalPlan = promo.plan;
        promoApplied = true;
        isFreePromo = promo.free;

        // If it's the free promo, activate immediately without Paystack
        if (isFreePromo) {
          const sub = await getOrCreateSubscription(businessId, db);
          const periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
          if (sub) {
            await db.subscription.update({
              where: { id: sub.id },
              data: {
                status: "ACTIVE",
                plan: "ANNUAL",
                currentPeriodEnd: periodEnd,
                amountPaid: 0,
                promoCode: promoCode.toLowerCase(), // save in lowercase for consistent badge display
                paystackRef: `FREE-PROMO-${Date.now()}`,
              },
            });
          }

          try {
            await db.auditLog.create({
              data: {
                businessId,
                actorType: "USER",
                actorName: session.user.name ?? "Owner",
                action: "SUBSCRIPTION_ACTIVATED",
                tool: "subscription.promo",
                result: "SUCCESS",
                riskLevel: "HIGH",
                details: JSON.stringify({ plan: "ANNUAL", promo: promoCode, free: true }),
              },
            });
          } catch {}

          return NextResponse.json({
            ok: true,
            free: true,
            plan: "ANNUAL",
            currentPeriodEnd: periodEnd.toISOString(),
          });
        }
      } else {
        return NextResponse.json({ error: "Invalid promo code" }, { status: 400 });
      }
    } else {
      amount = plan === "ANNUAL" ? PRICING.ANNUAL.amount : PRICING.MONTHLY.amount;
    }

    // ===== Check Paystack configuration BEFORE calling the API =====
    const cfg = getPaystackConfig();
    if (!cfg.secretKey) {
      console.error("[subscription/initiate] PAYSTACK_SECRET_KEY is not set");
      return NextResponse.json({
        error: "Payment not configured. The platform owner needs to set PAYSTACK_SECRET_KEY in Vercel environment variables. The secret key starts with 'sk_' (not 'pk_').",
      }, { status: 500 });
    }

    if (!cfg.secretKey.startsWith("sk_")) {
      console.error("[subscription/initiate] PAYSTACK_SECRET_KEY doesn't start with sk_ — might be the public key");
      return NextResponse.json({
        error: "The Paystack secret key looks wrong. Make sure you're using the SECRET key (starts with 'sk_'), not the PUBLIC key (starts with 'pk_'). Go to Vercel → Settings → Environment Variables → PAYSTACK_SECRET_KEY and update it.",
      }, { status: 500 });
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
      console.error("[subscription/initiate] initializeTransaction returned null");
      return NextResponse.json({
        error: "Paystack rejected the request. Check that the secret key is correct and active. If you just added it, make sure you redeployed.",
      }, { status: 500 });
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
    return NextResponse.json({ error: "Failed to initiate payment: " + String(e?.message ?? e).slice(0, 100) }, { status: 500 });
  }
}
