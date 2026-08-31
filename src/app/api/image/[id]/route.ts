/**
 * GET /api/image/[id]
 *
 * Serves a product image from the database (base64-encoded).
 * This works on Vercel where the filesystem is read-only.
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
    select: { imageData: true },
  });

  if (!product?.imageData) {
    return new NextResponse("Not found", { status: 404 });
  }

  // imageData is stored as "data:image/jpeg;base64,..."
  const match = product.imageData.match(/^data:image\/([a-z]+);base64,(.+)$/);
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
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
  };

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentTypes[ext] ?? "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
