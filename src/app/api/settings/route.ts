/**
 * Settings API — update the business's AI personalization.
 *
 * POST /api/settings
 *   { agentName, agentInstructions }
 *
 * Only the authenticated owner can update their own business settings.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDatabase } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDatabase();
  const businessId = session.user.businessId;

  try {
    const body = await req.json();
    const { agentName, agentInstructions } = body as {
      agentName?: string;
      agentInstructions?: string;
    };

    // Validate
    if (!agentName || typeof agentName !== "string" || !agentName.trim()) {
      return NextResponse.json({ error: "Assistant name is required" }, { status: 400 });
    }

    if (agentName.trim().length > 50) {
      return NextResponse.json({ error: "Assistant name must be 50 characters or less" }, { status: 400 });
    }

    if (agentInstructions && typeof agentInstructions !== "string") {
      return NextResponse.json({ error: "Invalid instructions" }, { status: 400 });
    }

    if (agentInstructions && agentInstructions.length > 5000) {
      return NextResponse.json({ error: "Instructions must be 5000 characters or less" }, { status: 400 });
    }

    // Update the business
    const updated = await db.business.update({
      where: { id: businessId },
      data: {
        agentName: agentName.trim(),
        agentInstructions: (agentInstructions ?? "").trim(),
      },
      select: { id: true, agentName: true, agentInstructions: true },
    });

    // Audit log
    try {
      await db.auditLog.create({
        data: {
          businessId,
          actorType: "USER",
          actorName: session.user.name ?? "Owner",
          action: "UPDATE_SETTINGS",
          tool: "settings.personalization",
          result: "SUCCESS",
          riskLevel: "LOW",
          details: JSON.stringify({ agentName: updated.agentName }),
        },
      });
    } catch (e) {
      console.error("[settings] audit log failed:", e);
    }

    return NextResponse.json({
      ok: true,
      agentName: updated.agentName,
      agentInstructions: updated.agentInstructions,
    });
  } catch (err: any) {
    console.error("[settings] error:", err?.message ?? err);
    return NextResponse.json(
      { error: "Failed to save settings. Please try again." },
      { status: 500 }
    );
  }
}
