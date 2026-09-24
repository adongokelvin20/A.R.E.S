/**
 * Paystack Payment Integration
 *
 * Pricing:
 *   - 1-week free trial
 *   - GHC 1300/year (standard)
 *   - ~GHC 115/month (calculated from annual: 1300/12 ≈ 108, rounded to 115)
 *   - Promo code "Kelvin" = GHC 600/year
 *
 * Money goes to the merchant MoMo number 0206646970 (configured in Paystack dashboard).
 *
 * Flow:
 *   1. Customer signs up → gets 1-week free trial (status=TRIAL)
 *   2. Trial ends → dashboard gated, customer sees pricing page
 *   3. Customer selects plan → Paystack checkout
 *   4. Payment successful → subscription activated
 */

export const PRICING = {
  TRIAL_DAYS: 7,
  ANNUAL: { amount: 130000, label: "GHC 1,300/year", plan: "ANNUAL" }, // amount in kobo (100 = GHC 1)
  MONTHLY: { amount: 11500, label: "GHC 115/month", plan: "MONTHLY" },
  PROMO: {
    code: "Kelvin",
    annualAmount: 60000, // GHC 600/year
    label: "GHC 600/year (promo)",
    plan: "ANNUAL",
  },
  // Secret promo — gives the system for free. Not shown publicly.
  FREE_PROMO: {
    code: "kratos",
    amount: 0,
    label: "Free (promo)",
    plan: "ANNUAL",
  },
};

export interface PaystackConfig {
  secretKey: string;
  publicKey: string;
  merchantEmail: string;
  merchantMomo: string;
}

export function getPaystackConfig(): PaystackConfig {
  return {
    secretKey: process.env.PAYSTACK_SECRET_KEY ?? "",
    publicKey: process.env.PAYSTACK_PUBLIC_KEY ?? "pk_live_eb57300aac67e720dd66e3cb330c54caf0d6aa7e",
    merchantEmail: process.env.PAYSTACK_MERCHANT_EMAIL ?? "kelvin@kevtech.dev",
    merchantMomo: "0206646970",
  };
}

export function isPaystackConfigured(): boolean {
  const cfg = getPaystackConfig();
  return !!cfg.secretKey && !!cfg.publicKey;
}

/**
 * Initialize a Paystack transaction.
 * Returns an authorization URL the customer is redirected to.
 */
export async function initializeTransaction(opts: {
  email: string;
  amount: number; // in kobo
  reference: string;
  callbackUrl: string;
  metadata?: any;
}): Promise<{ authorization_url: string; reference: string; access_code: string } | null> {
  const cfg = getPaystackConfig();
  if (!cfg.secretKey) return null;

  try {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.secretKey}`,
      },
      body: JSON.stringify({
        email: opts.email,
        amount: opts.amount,
        reference: opts.reference,
        callback_url: opts.callbackUrl,
        metadata: opts.metadata ?? {},
        // Mobile Money channels
        channels: ["mobile_money", "card", "ussd"],
      }),
    });
    const data = await res.json();
    if (data.status && data.data) {
      return {
        authorization_url: data.data.authorization_url,
        reference: data.data.reference,
        access_code: data.data.access_code,
      };
    }
    console.error("[paystack] init failed:", data?.message);
    return null;
  } catch (e: any) {
    console.error("[paystack] init error:", e?.message);
    return null;
  }
}

/**
 * Verify a Paystack transaction by reference.
 */
export async function verifyTransaction(reference: string): Promise<{
  status: "success" | "failed" | "pending";
  amount: number;
  customerEmail: string;
  paidAt: string | null;
} | null> {
  const cfg = getPaystackConfig();
  if (!cfg.secretKey) return null;

  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${cfg.secretKey}` },
    });
    const data = await res.json();
    if (data.status && data.data) {
      return {
        status: data.data.status === "success" ? "success" : data.data.status === "failed" ? "failed" : "pending",
        amount: data.data.amount,
        customerEmail: data.data.customer?.email ?? "",
        paidAt: data.data.paid_at ?? null,
      };
    }
    return null;
  } catch (e: any) {
    console.error("[paystack] verify error:", e?.message);
    return null;
  }
}

/**
 * Validate a promo code and return the adjusted amount.
 */
export function validatePromoCode(code: string): { valid: boolean; amount: number; plan: string; label: string; free: boolean } {
  if (!code) return { valid: false, amount: 0, plan: "", label: "", free: false };
  const normalized = code.trim().toLowerCase();

  // Free promo — gives the system for free (secret)
  if (normalized === PRICING.FREE_PROMO.code.toLowerCase()) {
    return {
      valid: true,
      amount: 0,
      plan: PRICING.FREE_PROMO.plan,
      label: PRICING.FREE_PROMO.label,
      free: true,
    };
  }

  // Kelvin promo — GHC 600/year
  if (normalized === PRICING.PROMO.code.toLowerCase()) {
    return {
      valid: true,
      amount: PRICING.PROMO.annualAmount,
      plan: PRICING.PROMO.plan,
      label: PRICING.PROMO.label,
      free: false,
    };
  }

  return { valid: false, amount: 0, plan: "", label: "", free: false };
}

/**
 * Get the subscription status for a business.
 * Creates a trial subscription if none exists.
 */
export async function getOrCreateSubscription(businessId: string, db: any) {
  if (!db) return null;
  try {
    let sub = await db.subscription.findUnique({ where: { businessId } });

    if (!sub) {
      // No subscription record — check when the business was created.
      // If the business is older than 7 days, create an EXPIRED subscription
      // (not a trial) so they're locked out immediately.
      const business = await db.business.findUnique({
        where: { id: businessId },
        select: { createdAt: true },
      });

      const sevenDaysAgo = new Date(Date.now() - PRICING.TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const isOlderThan7Days = business?.createdAt && new Date(business.createdAt) < sevenDaysAgo;

      if (isOlderThan7Days) {
        // Account is older than 7 days — create as EXPIRED (locked)
        const trialEndsAt = new Date(business.createdAt.getTime() + PRICING.TRIAL_DAYS * 24 * 60 * 60 * 1000);
        sub = await db.subscription.create({
          data: {
            businessId,
            status: "EXPIRED",
            plan: "TRIAL",
            trialEndsAt,
          },
        });
      } else {
        // New account — create a 7-day trial
        const trialEndsAt = new Date(Date.now() + PRICING.TRIAL_DAYS * 24 * 60 * 60 * 1000);
        sub = await db.subscription.create({
          data: {
            businessId,
            status: "TRIAL",
            plan: "TRIAL",
            trialEndsAt,
          },
        });
      }
    }

    // Check if trial has expired
    if (sub.status === "TRIAL" && sub.trialEndsAt && sub.trialEndsAt < new Date()) {
      sub = await db.subscription.update({
        where: { id: sub.id },
        data: { status: "EXPIRED" },
      });
    }

    // Check if paid subscription has expired
    if (sub.status === "ACTIVE" && sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) {
      sub = await db.subscription.update({
        where: { id: sub.id },
        data: { status: "EXPIRED" },
      });
    }

    return sub;
  } catch (e) {
    console.error("[subscription] failed:", e);
    return null;
  }
}

/**
 * Check if a business has access (trial active or paid).
 * Returns false on null/unknown — the caller decides the fallback.
 */
export function hasAccess(sub: any): boolean {
  if (!sub) return false;
  if (sub.status === "ACTIVE") return true;
  if (sub.status === "TRIAL" && sub.trialEndsAt && new Date(sub.trialEndsAt) > new Date()) return true;
  return false;
}
