/**
 * Kevtech automations API
 *
 * GET  /api/automations  -- list automations for the business
 * POST /api/automations  -- create a new automation
 *   { name, description?, trigger, actions: [], condition? }
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TRIGGERS = [
  "NEW_ORDER",
  "LOW_INVENTORY",
  "CUSTOMER_WAIT",
  "PAYMENT_RECEIVED",
  "PAYMENT_FAILED",
  "NEW_CUSTOMER",
  "ORDER_CANCELLED",
  "DAILY_SUMMARY",
  "CUSTOM",
];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const automations = await db.automation.findMany({
    where: { businessId: session.user.businessId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    automations: automations.map((a) => ({
      ...a,
      actions: JSON.parse(a.actions),
      condition: JSON.parse(a.condition),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = session.user.businessId;

  try {
    const body = await req.json();
    const { name, description, trigger, actions, condition } = body as {
      name?: string;
      description?: string;
      trigger?: string;
      actions?: string[];
      condition?: any;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!trigger || !VALID_TRIGGERS.includes(trigger)) {
      return NextResponse.json({ error: "Invalid trigger" }, { status: 400 });
    }
    if (!Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json({ error: "At least one action is required" }, { status: 400 });
    }

    const automation = await db.automation.create({
      data: {
        businessId,
        name: name.trim(),
        description: description?.trim() || null,
        trigger,
        actions: JSON.stringify(actions),
        condition: JSON.stringify(condition ?? {}),
        status: "ACTIVE",
      },
    });

    await db.auditLog.create({
      data: {
        businessId,
        actorType: "USER",
        actorName: session.user.name,
        action: "CREATE_AUTOMATION",
        tool: "automations.create",
        target: automation.id,
        result: "SUCCESS",
        riskLevel: "LOW",
        details: JSON.stringify({ name, trigger }),
      },
    });

    return NextResponse.json({
      ok: true,
      automation: {
        ...automation,
        actions: JSON.parse(automation.actions),
        condition: JSON.parse(automation.condition),
      },
    });
  } catch (err: any) {
    console.error("[automations POST] error", err);
    return NextResponse.json(
      { error: "Failed to create automation.", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
