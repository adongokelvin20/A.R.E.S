/**
 * A.R.E.S. signup -- creates the owner + business shell.
 * Onboarding (sector, agent name, etc.) is a separate step.
 *
 * POST /api/auth/signup
 *   { email, password, ownerName, businessName }
 * Returns: { ok, businessId, email }
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function makeSlugUnique(base: string) {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, ownerName, businessName } = body as {
      email?: string;
      password?: string;
      ownerName?: string;
      businessName?: string;
    };

    if (!email || !password || !ownerName || !businessName) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Reject if email already exists anywhere (one business per email for now)
    const existing = await db.user.findFirst({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Create the business shell -- sector is set during onboarding
    const baseSlug = slugify(businessName) || "business";
    let slug = baseSlug;
    while (await db.business.findUnique({ where: { slug } })) {
      slug = makeSlugUnique(baseSlug);
    }

    const business = await db.business.create({
      data: {
        name: businessName.trim(),
        slug,
        type: "SERVICE", // default; changed during onboarding
        description: "",
        country: "GH",
        currency: "GHS",
        timezone: "Africa/Accra",
        language: "en",
        email: normalizedEmail,
        enabledModules: JSON.stringify(["customers", "orders", "products"]),
        plan: "STARTER",
        status: "ACTIVE",
        agentName: "A.R.E.S.",
        agentPersonality: "professional",
        ownerFirstName: ownerName.trim().split(" ")[0],
      },
    });

    const passwordHash = await hashPassword(password);
    await db.user.create({
      data: {
        businessId: business.id,
        email: normalizedEmail,
        name: ownerName.trim(),
        passwordHash,
        role: "OWNER",
        status: "ACTIVE",
      },
    });

    return NextResponse.json({
      ok: true,
      businessId: business.id,
      email: normalizedEmail,
    });
  } catch (err: any) {
    console.error("[signup] error", err);
    return NextResponse.json(
      { error: "Signup failed.", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
