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
          // Make sure the Subscription table exists — create it directly if needed
          try {
            await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Subscription" ("id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'TRIAL', "plan" TEXT NOT NULL DEFAULT 'TRIAL', "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "trialEndsAt" TIMESTAMP(3), "currentPeriodEnd" TIMESTAMP(3), "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0, "currency" TEXT NOT NULL DEFAULT 'GHS', "promoCode" TEXT, "paystackRef" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id"))`);
            await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_businessId_key" ON "Subscription"("businessId")`);
          } catch (e) {
            console.error("[subscription/initiate] create table failed:", e);
          }

          const periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
          const promoCodeLower = promoCode.toLowerCase();
          const ref = `FREE-PROMO-${Date.now()}`;
          
          // Try to find existing subscription
          let sub: any = null;
          try {
            sub = await db.subscription.findUnique({ where: { businessId } });
          } catch (e) {
            console.error("[subscription/initiate] findUnique failed:", e);
          }

          // If found, UPDATE it
          if (sub) {
            try {
              await db.subscription.update({
                where: { id: sub.id },
                data: {
                  status: "ACTIVE",
                  plan: "ANNUAL",
                  currentPeriodEnd: periodEnd,
                  amountPaid: 0,
                  promoCode: promoCodeLower,
                  paystackRef: ref,
                },
              });
            } catch (e) {
              console.error("[subscription/initiate] update failed:", e);
            }
          } else {
            // Not found — CREATE it
            try {
              await db.subscription.create({
                data: {
                  businessId,
                  status: "ACTIVE",
                  plan: "ANNUAL",
                  currentPeriodEnd: periodEnd,
                  amountPaid: 0,
                  promoCode: promoCodeLower,
                  paystackRef: ref,
                  trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
              });
            } catch (e) {
              console.error("[subscription/initiate] create failed:", e);
              // Try raw SQL insert as fallback
              try {
                await db.$executeRawUnsafe(`INSERT INTO "Subscription" ("id", "businessId", "status", "plan", "startedAt", "trialEndsAt", "currentPeriodEnd", "amountPaid", "currency", "promoCode", "paystackRef", "createdAt", "updatedAt") VALUES ('${Date.now()}', '${businessId}', 'ACTIVE', 'ANNUAL', NOW(), NOW() + INTERVAL '7 days', NOW() + INTERVAL '365 days', 0, 'GHS', '${promoCodeLower}', '${ref}', NOW(), NOW()) ON CONFLICT ("businessId") DO UPDATE SET "status" = 'ACTIVE', "plan" = 'ANNUAL', "currentPeriodEnd" = NOW() + INTERVAL '365 days', "amountPaid" = 0, "promoCode" = '${promoCodeLower}', "paystackRef" = '${ref}', "updatedAt" = NOW()`);
              } catch (e3) {
                console.error("[subscription/initiate] raw SQL failed:", e3);
                return NextResponse.json({ error: "Could not create subscription: " + String(e3?.message ?? e3).slice(0, 150) }, { status: 500 });
              }
            }
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

          // ===== VERIFY the subscription was actually saved =====
          try {
            const verify = await db.subscription.findUnique({ where: { businessId } });
            if (!verify || verify.status !== "ACTIVE") {
              // Something went wrong — try one more time
              if (verify) {
                await db.subscription.update({
                  where: { id: verify.id },
                  data: {
                    status: "ACTIVE",
                    plan: "ANNUAL",
                    currentPeriodEnd: periodEnd,
                    amountPaid: 0,
                    promoCode: promoCode.toLowerCase(),
                    paystackRef: `FREE-PROMO-${Date.now()}`,
                  },
                });
              } else {
                await db.subscription.create({
                  data: {
                    businessId,
                    status: "ACTIVE",
                    plan: "ANNUAL",
                    currentPeriodEnd: periodEnd,
                    amountPaid: 0,
                    promoCode: promoCode.toLowerCase(),
                    paystackRef: `FREE-PROMO-${Date.now()}`,
                    trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                  },
                });
              }
            }
          } catch (e) {
            console.error("[subscription/initiate] verification failed:", e);
          }

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
