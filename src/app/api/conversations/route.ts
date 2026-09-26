/**
 * GET /api/conversations          -- list all conversations grouped by customer name
 * GET /api/conversations?id=X     -- get full message thread for one conversation
 * GET /api/conversations?customer=phone -- get all threads for one customer
 *
 * Conversations are grouped by the CUSTOMER'S NAME (not phone or ID).
 * The name is extracted from the chat and saved to the conversation record.
 * The owner sees the customer's name as the conversation title.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDatabase } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureDatabase();
  const businessId = session.user.businessId;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const customerKey = searchParams.get("customer");

  // Return a single conversation thread (full messages)
  if (id) {
    try {
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
    } catch (e) {
      console.error("[conversations] thread fetch failed:", e);
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
  }

  // Return all conversations for a specific customer
  if (customerKey) {
    try {
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
    } catch (e) {
      console.error("[conversations] customer fetch failed:", e);
      return NextResponse.json({ conversations: [] });
    }
  }

  // List ALL conversations with message counts
  try {
    const conversations = await db.conversation.findMany({
      where: { businessId },
      orderBy: { lastMessageAt: "desc" },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { content: true, role: true, createdAt: true } },
        _count: { select: { messages: true } },
        customer: true,
      },
    });

    // Group by customer name (or externalId/sessionId if name is null)
    const grouped = new Map<string, {
      customerName: string;
      customerPhone: string | null;
      conversationIds: string[];
      totalMessages: number;
      lastActivity: Date;
      lastMessage: string | null;
    }>();

    for (const c of conversations) {
      // Determine the display name and grouping key
      const rawName = c.customerName || c.customer?.name || null;
      const displayName = rawName && rawName !== "Unknown customer" ? rawName : null;
      // Group key: use name if available, otherwise sessionId, otherwise phone, otherwise conversation id
      const key = displayName || c.externalId || c.customerPhone || c.id;
      const msgCount = c._count?.messages ?? 0;
      const lastMsg = c.messages?.[0]?.content ?? null;

      const existing = grouped.get(key);
      if (existing) {
        existing.conversationIds.push(c.id);
        existing.totalMessages += msgCount;
        // Update name if we find it
        if (displayName && (existing.customerName === "Unknown customer" || !existing.customerName)) {
          existing.customerName = displayName;
        }
        if (c.lastMessageAt > existing.lastActivity) {
          existing.lastActivity = c.lastMessageAt;
          existing.lastMessage = lastMsg;
        }
      } else {
        grouped.set(key, {
          customerName: displayName || "Unknown customer",
          customerPhone: c.customerPhone,
          conversationIds: [c.id],
          totalMessages: msgCount,
          lastActivity: c.lastMessageAt,
          lastMessage: lastMsg,
        });
      }
    }

    return NextResponse.json({
      groups: Array.from(grouped.values()).map((g) => ({
        key: g.customerName !== "Unknown customer" ? g.customerName : (g.customerPhone || g.conversationIds[0]),
        customerName: g.customerName,
        customerPhone: g.customerPhone,
        conversationCount: g.conversationIds.length,
        conversationIds: g.conversationIds,
        totalMessages: g.totalMessages,
        lastActivity: g.lastActivity,
        lastMessage: g.lastMessage,
      })),
    });
  } catch (e) {
    console.error("[conversations] list failed:", e);
    return NextResponse.json({ groups: [] });
  }
}
