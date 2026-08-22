/**
 * Kevtech onboarding -- completes the business profile after signup.
 *
 * POST /api/auth/onboard
 *   { businessId, sectorCategory, sectorSubtype, country, description, phone, address,
 *     ownerFirstName }
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SECTOR_CATALOG, COUNTRIES, findSubtype } from "@/lib/sector-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      businessId,
      sectorCategory,
      sectorSubtype,
      allSectors,
      country,
      description,
      phone,
      address,
      ownerFirstName,
      agentName,
      agentInstructions,
    } = body as {
      businessId?: string;
      sectorCategory?: string;
      sectorSubtype?: string;
      allSectors?: { category: string; subtype: string; categoryLabel: string; subtypeLabel: string }[];
      country?: string;
      description?: string;
      phone?: string;
      address?: string;
      ownerFirstName?: string;
      agentName?: string;
      agentInstructions?: string;
    };

    if (!businessId) {
      return NextResponse.json({ error: "businessId required" }, { status: 400 });
    }
    if (!sectorCategory || !sectorSubtype) {
      return NextResponse.json({ error: "Sector category and subtype are required" }, { status: 400 });
    }

    const subtype = findSubtype(sectorCategory, sectorSubtype);
    if (!subtype) {
      return NextResponse.json({ error: "Invalid sector selection" }, { status: 400 });
    }

    const countryInfo = COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0];

    const business = await db.business.update({
      where: { id: businessId },
      data: {
        type: sectorSubtype, // primary subtype for backward compat
        sectorCategory,
        sectorSubtype,
        description: description ?? null,
        country: countryInfo.code,
        currency: countryInfo.currency,
        phone: phone ?? null,
        address: address ?? null,
        agentName: agentName?.trim() || "Kevtech",
        agentInstructions: agentInstructions ?? "",
        ownerFirstName: ownerFirstName?.trim() || null,
        enabledModules: JSON.stringify(subtype.modules),
        // Store all selected sectors in configuration for multi-sector support
        configuration: JSON.stringify({ allSectors: allSectors ?? [{ category: sectorCategory, subtype: sectorSubtype }] }),
        onboardedAt: new Date(),
      },
    });

    // Seed default knowledge entries for the subtype
    for (const k of subtype.defaultKnowledge) {
      await db.knowledgeEntry.create({
        data: {
          businessId: business.id,
          category: k.category,
          question: k.question,
          answer: k.answer,
        },
      });
    }

    return NextResponse.json({ ok: true, business });
  } catch (err: any) {
    console.error("[onboard] error", err);
    return NextResponse.json(
      { error: "Onboarding failed.", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return the catalog for the onboarding UI to consume
  return NextResponse.json({ sectors: SECTOR_CATALOG, countries: COUNTRIES });
}
