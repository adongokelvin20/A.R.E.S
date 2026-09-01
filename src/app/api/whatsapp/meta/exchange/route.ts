/**
 * POST /api/whatsapp/meta/exchange
 *   { code }
 *
 * Called by the frontend after the FB SDK popup completes with an auth code.
 * Exchanges the code, fetches WABA + phone number, registers the webhook,
 * and stores everything in the Integration row.
 *
 * The businessId comes from the session — the customer never passes it.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { completeEmbeddedSignup } from "@/lib/meta-whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = session.user.businessId;

  try {
    const body = await req.json();
    const { code } = body as { code?: string };
    if (!code) {
      return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
    }

    const result = await completeEmbeddedSignup(code, businessId, db);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error ?? "Connection failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      phoneNumber: result.phoneNumber,
      verifiedName: result.verifiedName,
    });
  } catch (err: any) {
    console.error("[whatsapp/meta/exchange] error:", err);
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err).slice(0, 200) },
      { status: 500 }
    );
  }
}
