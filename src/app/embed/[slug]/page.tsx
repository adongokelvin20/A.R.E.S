import { db, ensureDatabase } from "@/lib/db";
import { notFound } from "next/navigation";
import { EmbedClient } from "./embed-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    await ensureDatabase();
  } catch {}

  let business: any = null;
  let products: any[] = [];
  try {
    business = await db.business.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, agentName: true, currency: true },
    });
    if (business) {
      products = await db.product.findMany({
        where: { businessId: business.id, status: "ACTIVE" },
        take: 20,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, price: true, currency: true, imageUrl: true },
      });
    }
  } catch (e: any) {
    console.error("[embed page] db failed:", e?.message);
  }

  if (!business) notFound();

  return <EmbedClient business={business} products={products} />;
}
