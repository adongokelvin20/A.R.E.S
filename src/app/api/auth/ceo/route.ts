import { NextRequest, NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await ensureDatabase();
    const { username, password } = await req.json();
    if (username === "Kevtech.ceo" && password === "Ayinbisa") {
      const businesses = await db.business.findMany({ select: { id: true, name: true, slug: true, plan: true, status: true, createdAt: true, country: true, currency: true, sectorCategory: true, sectorSubtype: true, agentName: true, _count: { select: { orders: true, customers: true, products: true, conversations: true } } } });
      const subscriptions = await db.subscription.findMany({ select: { businessId: true, status: true, plan: true, startedAt: true, trialEndsAt: true, currentPeriodEnd: true, amountPaid: true, currency: true } });
      const totalRevenue = subscriptions.filter(s => s.status === "ACTIVE").reduce((sum, s) => sum + (s.amountPaid || 0), 0);
      const totalOrders = await db.order.count();
      const confirmedOrders = await db.order.count({ where: { status: "CONFIRMED" } });
      const totalCustomers = await db.customer.count();
      const totalBusinesses = businesses.length;
      const activeBusinesses = businesses.filter(b => b.status === "ACTIVE").length;
      const businessStats = businesses.map(b => {
        const sub = subscriptions.find(s => s.businessId === b.id);
        return { id: b.id, name: b.name, slug: b.slug, plan: b.plan, status: b.status, createdAt: b.createdAt, country: b.country, currency: b.currency, sector: b.sectorCategory || b.sectorSubtype || "Unknown", agentName: b.agentName, orderCount: b._count.orders, customerCount: b._count.customers, productCount: b._count.products, conversationCount: b._count.conversations, subscription: sub ? { status: sub.status, plan: sub.plan, trialEndsAt: sub.trialEndsAt, currentPeriodEnd: sub.currentPeriodEnd, amountPaid: sub.amountPaid } : null };
      });
      return NextResponse.json({ authenticated: true, stats: { totalRevenue, totalOrders, confirmedOrders, totalCustomers, totalBusinesses, activeBusinesses }, businesses: businessStats });
    }
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch (e: any) {
    console.error("[CEO login] error:", e?.message);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
