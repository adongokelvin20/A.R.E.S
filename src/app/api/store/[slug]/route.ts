/**
 * GET /api/store/[slug]
 *
 * Public endpoint — no auth required.
 * Returns the business's public info + active products for the store page.
 * CHECKS SUBSCRIPTION: if the owner's subscription is expired, returns
 * {locked: true} so the store page shows a "temporarily unavailable" message.
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
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try { await ensureDatabase(); } catch {}

  try {
    const business = await db.business.findUnique({
      where: { slug },
      select: {
        id: true, name: true, slug: true, type: true, description: true,
        currency: true, country: true, agentName: true,
        sectorCategory: true, sectorSubtype: true,
        phone: true, email: true, logoUrl: true, createdAt: true,
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // ===== SUBSCRIPTION CHECK — lock the store if the owner's subscription is expired =====
    let storeLocked = false;
    try {
      const sub = await getOrCreateSubscription(business.id, db);
      const access = hasAccess(sub);
      const businessAge = business.createdAt ? Date.now() - new Date(business.createdAt).getTime() : 0;
      const isOlderThan7Days = businessAge > SEVEN_DAYS_MS;

      if (!access) storeLocked = true;
      if (isOlderThan7Days && (!sub || (sub.status !== "ACTIVE" && !(sub.status === "TRIAL" && sub.trialEndsAt && new Date(sub.trialEndsAt) > new Date())))) {
        storeLocked = true;
      }
    } catch (e) {
      console.error("[store API] subscription check failed:", e);
    }

    if (storeLocked) {
      return NextResponse.json({
        locked: true,
        business: { name: business.name, agentName: business.agentName || business.name },
      });
    }

    const products = await db.product.findMany({
      where: { businessId: business.id, status: "ACTIVE" },
      select: {
        id: true, name: true, description: true, price: true, currency: true,
        category: true, imageUrl: true, imageAlt: true, stock: true, attributes: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      business: {
        name: business.name, slug: business.slug, description: business.description,
        currency: business.currency, agentName: business.agentName || business.name,
        phone: business.phone, email: business.email, logoUrl: business.logoUrl,
      },
      products: products.map((p) => ({
        id: p.id, name: p.name, description: p.description, price: p.price,
        currency: p.currency, category: p.category, imageUrl: p.imageUrl,
        imageAlt: p.imageAlt, inStock: p.stock > 0,
        attributes: JSON.parse(p.attributes || "{}"),
      })),
    });
  } catch (e: any) {
    console.error("[store API] error:", e?.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
