/**
 * GET /api/payment-screenshots/[id]
 *
 * Returns the full screenshot image (base64) for a specific payment screenshot.
 * Used when the owner clicks to view a screenshot in the dashboard.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDatabase } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await ensureDatabase();

    const { id } = await params;

    const screenshot = await db.paymentScreenshot.findUnique({
      where: { id },
      select: { imageData: true, businessId: true },
    });

    if (!screenshot || screenshot.businessId !== session.user.businessId) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Return the image directly
    const match = screenshot.imageData.match(/^data:image\/([a-z]+);base64,(.+)$/);
    if (!match) {
      return new NextResponse("Invalid image data", { status: 500 });
    }

    const ext = match[1];
    const base64 = match[2];
    const buffer = Buffer.from(base64, "base64");

    const contentTypes: Record<string, string> = {
      jpeg: "image/jpeg",
      jpg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
    };

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentTypes[ext] || "image/png",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (e: any) {
    console.error("[payment-screenshot] error:", e?.message);
    return new NextResponse("Server error", { status: 500 });
  }
}
