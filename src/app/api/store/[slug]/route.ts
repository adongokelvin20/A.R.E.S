/**
 * GET /api/store/[slug]
 *
 * Public endpoint — no auth required.
 * Returns the business's public info + active products for the store page.
 * Only exposes fields that are safe for the public (no credentials, no internals).
 */
import { NextRequest, NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // If db is null, return a clear error
  if (!db) {
    return NextResponse.json(
      { error: "Database not configured", detail: "The server is missing a DATABASE_URL." },
      { status: 503 }
    );
  }

  // Ensure tables exist
  try {
    await ensureDatabase();
  } catch (e) {
    console.error("[store API] ensureDatabase failed:", e);
  }

  try {
    const business = await db.business.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        description: true,
        currency: true,
        country: true,
        agentName: true,
        sectorCategory: true,
        sectorSubtype: true,
        phone: true,
        email: true,
        logoUrl: true,
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const products = await db.product.findMany({
      where: { businessId: business.id, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        currency: true,
        category: true,
        imageUrl: true,
        imageAlt: true,
        stock: true,
        attributes: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      business: {
        name: business.name,
        slug: business.slug,
        description: business.description,
        currency: business.currency,
        agentName: business.agentName || business.name,
        phone: business.phone,
        email: business.email,
        logoUrl: business.logoUrl,
      },
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        currency: p.currency,
        category: p.category,
        imageUrl: p.imageUrl,
        imageAlt: p.imageAlt,
        inStock: p.stock > 0,
        attributes: JSON.parse(p.attributes || "{}"),
      })),
    });
  } catch (e: any) {
    console.error("[store API] database error:", e?.message ?? e);
    return NextResponse.json(
      { error: "Database error", detail: String(e?.message ?? e).slice(0, 200) },
      { status: 500 }
    );
  }
}
