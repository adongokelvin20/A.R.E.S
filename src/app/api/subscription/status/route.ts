/**
 * GET /api/subscription/status
 *
 * Returns the current subscription status for the authenticated business.
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

  await ensureDatabase();
  const businessId = session.user.businessId;

  const sub = await getOrCreateSubscription(businessId, db);

  return NextResponse.json({
    status: sub?.status ?? "TRIAL",
    plan: sub?.plan ?? "TRIAL",
    trialEndsAt: sub?.trialEndsAt ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    hasAccess: hasAccess(sub),
    daysLeft: sub?.trialEndsAt ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : 0,
    pricing: PRICING,
  });
}
