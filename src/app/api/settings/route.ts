/**
 * POST /api/settings
 * Updates AI personalization (agentName, agentInstructions) without touching sector.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = session.user.businessId;

  try {
    const body = await req.json();
    const { agentName, agentInstructions } = body as {
      agentName?: string;
      agentInstructions?: string;
    };

    const business = await db.business.update({
      where: { id: businessId },
      data: {
        agentName: agentName?.trim() || "Kevtech",
        agentInstructions: agentInstructions ?? "",
      },
    });

    await db.auditLog.create({
      data: {
        businessId,
        actorType: "USER",
        actorName: session.user.name,
        action: "UPDATE_AI_PERSONALIZATION",
        tool: "settings.ai",
        result: "SUCCESS",
        riskLevel: "LOW",
        details: JSON.stringify({ agentName: business.agentName }),
      },
    });

    return NextResponse.json({ ok: true, business });
  } catch (err: any) {
    console.error("[settings] error", err);
    return NextResponse.json(
      { error: "Failed to update settings.", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
