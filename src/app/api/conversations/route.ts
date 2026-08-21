/**
 * GET /api/conversations          -- list all conversations grouped by customer
 * GET /api/conversations?id=X     -- get full message thread for one conversation
 * GET /api/conversations?customer=phone -- get all threads for one customer
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = session.user.businessId;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const customerKey = searchParams.get("customer");

  // Return a single conversation thread
  if (id) {
    const conversation = await db.conversation.findFirst({
      where: { id, businessId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        customer: true,
      },
    });
    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ conversation });
  }

  // Return all conversations for a specific customer (by phone or name)
  if (customerKey) {
    const conversations = await db.conversation.findMany({
      where: {
        businessId,
        OR: [
          { customerPhone: customerKey },
          { customerName: customerKey },
        ],
      },
      orderBy: { lastMessageAt: "desc" },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    return NextResponse.json({ conversations });
  }

  // List all conversations, grouped by customer
  const conversations = await db.conversation.findMany({
    where: { businessId },
    orderBy: { lastMessageAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      customer: true,
    },
  });

  // Group by customer (phone or name)
  const grouped = new Map<string, {
    customerName: string;
    customerPhone: string | null;
    conversationIds: string[];
    totalMessages: number;
    lastActivity: Date;
  }>();

  for (const c of conversations) {
    const key = c.customerPhone || c.customerName || c.id;
    const existing = grouped.get(key);
    const msgCount = c.messages.length;
    if (existing) {
      existing.conversationIds.push(c.id);
      existing.totalMessages += msgCount;
      if (c.lastMessageAt > existing.lastActivity) {
        existing.lastActivity = c.lastMessageAt;
      }
    } else {
      grouped.set(key, {
        customerName: c.customerName || c.customer?.name || "Unknown customer",
        customerPhone: c.customerPhone,
        conversationIds: [c.id],
        totalMessages: msgCount,
        lastActivity: c.lastMessageAt,
      });
    }
  }

  return NextResponse.json({
    groups: Array.from(grouped.values()).map((g) => ({
      key: g.customerPhone || g.customerName,
      customerName: g.customerName,
      customerPhone: g.customerPhone,
      conversationCount: g.conversationIds.length,
      conversationIds: g.conversationIds,
      totalMessages: g.totalMessages,
      lastActivity: g.lastActivity,
    })),
  });
}
