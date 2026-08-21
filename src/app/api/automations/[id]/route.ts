/**
 * PATCH /api/automations/[id]  -- toggle status (ACTIVE / PAUSED)
 * DELETE /api/automations/[id] -- delete permanently
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = session.user.businessId;
  const { id } = await params;
  const body = await req.json();
  const { status } = body as { status?: string };

  if (!["ACTIVE", "PAUSED"].includes(status ?? "")) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const automation = await db.automation.findFirst({ where: { id, businessId } });
  if (!automation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.automation.update({ where: { id }, data: { status } });

  await db.auditLog.create({
    data: {
      businessId,
      actorType: "USER",
      actorName: session.user.name,
      action: status === "ACTIVE" ? "ACTIVATE_AUTOMATION" : "PAUSE_AUTOMATION",
      tool: "automations.toggle",
      target: id,
      result: "SUCCESS",
      riskLevel: "LOW",
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = session.user.businessId;
  const { id } = await params;

  const automation = await db.automation.findFirst({ where: { id, businessId } });
  if (!automation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.automation.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      businessId,
      actorType: "USER",
      actorName: session.user.name,
      action: "DELETE_AUTOMATION",
      tool: "automations.delete",
      target: id,
      result: "SUCCESS",
      riskLevel: "MEDIUM",
      details: JSON.stringify({ name: automation.name }),
    },
  });

  return NextResponse.json({ ok: true });
}
