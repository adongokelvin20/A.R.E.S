/**
 * GET /api/subscription/status
 *
 * Returns the current subscription status for the authenticated business.
 * Handles errors gracefully — if the table doesn't exist or any DB error,
 * returns a default trial status so the dashboard never crashes.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDatabase } from "@/lib/db";
import { getOrCreateSubscription, hasAccess, PRICING } from "@/lib/paystack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureDatabase();
  } catch (e) {
    console.error("[subscription/status] ensureDatabase failed:", e);
  }

  const businessId = session.user.businessId;

  let sub: any = null;
  try {
    sub = await getOrCreateSubscription(businessId, db);
  } catch (e) {
    console.error("[subscription/status] getOrCreateSubscription failed:", e);
    // Return a default trial status so the dashboard doesn't crash
    return NextResponse.json({
      status: "TRIAL",
      plan: "TRIAL",
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      currentPeriodEnd: null,
      hasAccess: true, // give access during errors so the user isn't locked out
      daysLeft: 7,
      pricing: PRICING,
    });
  }

  return NextResponse.json({
    status: sub?.status ?? "TRIAL",
    plan: sub?.plan ?? "TRIAL",
    promoCode: sub?.promoCode ?? null,
    trialEndsAt: sub?.trialEndsAt ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    hasAccess: hasAccess(sub),
    daysLeft: sub?.trialEndsAt ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : 0,
    pricing: PRICING,
  });
}
