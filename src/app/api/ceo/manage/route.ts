/**
 * POST /api/ceo/manage
 *   { username, password, action, businessId }
 *
 * CEO-only endpoint to manage business accounts.
 * NO audit logs are created — CEO activity is completely anonymous.
 */
import { NextRequest, NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await ensureDatabase();
    const { username, password, action, businessId } = await req.json();

    if (username !== "Kevtech.ceo" || password !== "Ayinbisa") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!businessId || !action) {
      return NextResponse.json({ error: "businessId and action are required" }, { status: 400 });
    }

    if (action === "suspend") {
      await db.business.update({ where: { id: businessId }, data: { status: "SUSPENDED" } });
      // No audit log — CEO activity is anonymous
      return NextResponse.json({ ok: true, message: "Business suspended" });
    }

    if (action === "activate") {
      await db.business.update({ where: { id: businessId }, data: { status: "ACTIVE" } });
      // No audit log — CEO activity is anonymous
      return NextResponse.json({ ok: true, message: "Business activated" });
    }

    if (action === "delete") {
      await db.business.delete({ where: { id: businessId } });
      // No audit log — CEO activity is anonymous
      return NextResponse.json({ ok: true, message: "Business deleted" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
