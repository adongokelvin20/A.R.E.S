/**
 * GET /api/image/[id]/2 — serves the second product image
 * GET /api/image/[id]/3 — serves the third product image
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const product = await db.product.findUnique({
    where: { id },
    select: { image2Data: true },
  });

  if (!product?.image2Data) {
    return new NextResponse("Not found", { status: 404 });
  }

  const match = product.image2Data.match(/^data:image\/([a-z]+);base64,(.+)$/);
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
      "Content-Type": contentTypes[ext] || "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
