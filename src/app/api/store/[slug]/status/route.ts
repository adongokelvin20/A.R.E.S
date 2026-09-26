/**
 * GET /api/store/[slug]/status
 *
 * Public endpoint — checks if the store is locked (owner's subscription expired).
 * Returns { locked: true/false } without requiring auth.
 */
import { NextRequest, NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";
import { getOrCreateSubscription, hasAccess } from "@/lib/paystack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!db) {
    return NextResponse.json({ locked: false });
  }

  try { await ensureDatabase(); } catch {}

  try {
    const business = await db.business.findUnique({
      where: { slug },
      select: { id: true, createdAt: true },
    });

    if (!business) {
      return NextResponse.json({ locked: false, notFound: true });
    }

    // Calculate age
    const businessAge = business.createdAt ? Date.now() - new Date(business.createdAt).getTime() : 0;
    const isOlderThan7Days = businessAge > SEVEN_DAYS_MS;

    // Check subscription
    let sub: any = null;
    try {
      sub = await getOrCreateSubscription(business.id, db);
    } catch (e) {
      console.error("[store status] subscription check failed:", e);
    }

    const access = hasAccess(sub);
    let locked = !access;

    if (isOlderThan7Days) {
      const hasValidSub = sub && (sub.status === "ACTIVE" || (sub.status === "TRIAL" && sub.trialEndsAt && new Date(sub.trialEndsAt) > new Date()));
      if (!hasValidSub) locked = true;
    }

    if (!sub && isOlderThan7Days) locked = true;

    return NextResponse.json({ locked });
  } catch (e: any) {
    console.error("[store status] error:", e?.message);
    return NextResponse.json({ locked: false });
  }
}
