/**
 * GET /api/ares/greeting
 * Returns a warm, personalized greeting from the AI when the owner logs in.
 * Time-aware + based on real business data.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateOwnerGreeting } from "@/lib/ares-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const greeting = await generateOwnerGreeting(session.user.businessId);
  return NextResponse.json({ greeting });
}
