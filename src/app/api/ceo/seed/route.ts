/**
 * POST /api/ceo/seed
 *   { username, password }
 *
 * Adds demo businesses to the CEO portal so it looks impressive.
 * Each business has realistic data: orders, customers, revenue.
 * Total net worth: GHS 7,234.56
 */
import { NextRequest, NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CEO_USERNAME = "Kevtech.ceo";
const CEO_PASSWORD = "Ayinbisa";

// Demo businesses — revenue numbers add up to ~7234.56 GHC
const DEMO_BUSINESSES = [
  {
    name: "Accra Fashion Hub",
    slug: "accra-fashion",
    type: "RETAIL",
    sectorCategory: "RETAIL",
    sectorSubtype: "CLOTHING_STORE",
    agentName: "Zara",
    phone: "+233241111111",
    email: "info@accrafashion.com",
    revenue: 1850.00,
    orders: 12,
    customers: 8,
  },
  {
    name: "Kumasi Food Corner",
    slug: "kumasi-food",
    type: "FOOD",
    sectorCategory: "FOOD",
    sectorSubtype: "RESTAURANT",
    agentName: "Kofi",
    phone: "+233242222222",
    email: "orders@kumasifood.com",
    revenue: 1230.50,
    orders: 18,
    customers: 15,
  },
  {
    name: "Takoradi Tech Store",
    slug: "takoradi-tech",
    type: "RETAIL",
    sectorCategory: "RETAIL",
    sectorSubtype: "ELECTRONICS_STORE",
    agentName: "Nova",
    phone: "+233243333333",
    email: "sales@takoraditech.com",
    revenue: 2150.00,
    orders: 7,
    customers: 5,
  },
  {
    name: "Bolgatanga Beauty Bar",
    slug: "bonga-beauty",
    type: "SERVICE",
    sectorCategory: "SERVICE",
    sectorSubtype: "BEAUTY_SALON",
    agentName: "Ama",
    phone: "+233244444444",
    email: "book@bongabeauty.com",
    revenue: 680.00,
    orders: 9,
    customers: 7,
  },
  {
    name: "Tamale Pharmacy Plus",
    slug: "tamale-pharma",
    type: "HEALTH",
    sectorCategory: "HEALTH",
    sectorSubtype: "PHARMACY",
    agentName: "Doc",
    phone: "+233245555555",
    email: "care@tamalepharma.com",
    revenue: 924.06,
    orders: 14,
    customers: 11,
  },
  {
    name: "Cape Coast Real Estate",
    slug: "cape-realestate",
    type: "REAL_ESTATE",
    sectorCategory: "REAL_ESTATE",
    sectorSubtype: "AGENCY",
    agentName: "Kwabena",
    phone: "+233246666666",
    email: "rent@caperealestate.com",
    revenue: 400.00,
    orders: 3,
    customers: 3,
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (username !== CEO_USERNAME || password !== CEO_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureDatabase();

    let created = 0;
    let skipped = 0;

    for (const demo of DEMO_BUSINESSES) {
      // Check if business already exists
      const existing = await db.business.findUnique({ where: { slug: demo.slug } }).catch(() => null);
      if (existing) {
        skipped++;
        continue;
      }

      // Create the business
      const business = await db.business.create({
        data: {
          name: demo.name,
          slug: demo.slug,
          type: demo.type,
          sectorCategory: demo.sectorCategory,
          sectorSubtype: demo.sectorSubtype,
          agentName: demo.agentName,
          phone: demo.phone,
          email: demo.email,
          country: "GH",
          currency: "GHS",
          status: "ACTIVE",
          plan: "ANNUAL",
          configuration: JSON.stringify({
            paymentInfo: "MTN MoMo: " + demo.phone,
            momoAccountName: demo.name,
            paymentEnabled: true,
            allSectors: [{ category: demo.sectorCategory, subtype: demo.sectorSubtype }],
          }),
        },
      });

      // Create customers
      const customerNames = ["Kwame Mensah", "Ama Serwaa", "Kofi Asante", "Akosua Djan", "Yaw Owusu", "Adwoa Boateng", "Kwesi Anim", "Esi Tutu"];
      for (let i = 0; i < demo.customers; i++) {
        await db.customer.create({
          data: {
            businessId: business.id,
            name: customerNames[i % customerNames.length] + " " + (i + 1),
            phone: "+233240000" + String(1000 + i),
            status: "ACTIVE",
          },
        }).catch(() => {});
      }

      // Create orders with revenue
      const orderCodes = ["AB3X", "CD7Y", "EF2K", "GH9M", "IJ5P", "KL3Q", "MN7R", "OP2S", "QR9T", "ST5U", "UV3V", "WX7W"];
      for (let i = 0; i < demo.orders; i++) {
        const orderTotal = demo.revenue / demo.orders;
        const isConfirmed = i < Math.ceil(demo.orders * 0.7);
        await db.order.create({
          data: {
            businessId: business.id,
            customerName: customerNames[i % customerNames.length],
            customerPhone: "+233240000" + String(1000 + i),
            status: isConfirmed ? "CONFIRMED" : "PENDING",
            channel: "WEB",
            total: orderTotal,
            currency: "GHS",
            notes: `Order code: ${orderCodes[i % orderCodes.length]}`,
            fulfillmentType: i % 2 === 0 ? "DELIVERY" : "PICKUP",
            deliveryLocation: i % 2 === 0 ? "Accra, Ghana" : null,
            deliveryTime: i % 2 === 0 ? "Tomorrow evening" : null,
            deliveryPhone: i % 2 === 0 ? "+233240000" + String(1000 + i) : null,
            items: {
              create: [{
                name: demo.type === "FOOD" ? "Jollof Rice & Chicken" : demo.type === "HEALTH" ? "Paracetamol 500mg" : "Product Item",
                quantity: 1,
                unitPrice: orderTotal,
                total: orderTotal,
              }],
            },
          },
        }).catch(() => {});
      }

      // Create subscription (paid annual)
      await db.subscription.create({
        data: {
          businessId: business.id,
          status: "ACTIVE",
          plan: "ANNUAL",
          startedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          currentPeriodEnd: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
          amountPaid: 1300,
          currency: "GHS",
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
        },
      }).catch(() => {});

      // Create a user (owner) for the business
      await db.user.create({
        data: {
          businessId: business.id,
          email: demo.email,
          name: demo.name + " Owner",
          role: "OWNER",
          status: "ACTIVE",
          passwordHash: "$2a$10$demo_hash_not_real_just_for_display",
        },
      }).catch(() => {});

      created++;
    }

    return NextResponse.json({
      ok: true,
      created,
      skipped,
      totalBusinesses: created + skipped,
      netWorth: "7234.56",
      currency: "GHS",
      message: `Added ${created} demo businesses${skipped > 0 ? `, ${skipped} already existed` : ""}. Total revenue: GHS 7,234.56`,
    });
  } catch (e: any) {
    console.error("[ceo/seed] error:", e?.message);
    return NextResponse.json({ error: "Failed to seed businesses: " + e?.message }, { status: 500 });
  }
}
