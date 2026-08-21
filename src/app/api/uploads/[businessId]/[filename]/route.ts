/**
 * GET /api/uploads/[businessId]/[filename]
 *
 * Serves uploaded product images from the filesystem.
 * This is more reliable than relying on the /public folder in production
 * builds where the standalone output may not include dynamically-created
 * directories.
 */
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ businessId: string; filename: string }> }
) {
  const { businessId, filename } = await params;

  // Sanitize — only allow alphanumeric, dash, underscore in the filename
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "");
  const safeBusinessId = businessId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeFilename || !safeBusinessId || safeFilename !== filename || safeBusinessId !== businessId) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Try multiple possible locations for the file
  const possibleRoots = [
    join(process.cwd(), "public", "uploads"),
    join(process.cwd(), "uploads"),
    join(process.cwd(), "..", "public", "uploads"),
  ];

  for (const root of possibleRoots) {
    const filePath = join(root, safeBusinessId, safeFilename);
    if (existsSync(filePath)) {
      try {
        const buffer = await readFile(filePath);
        const ext = safeFilename.split(".").pop()?.toLowerCase() ?? "";
        const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      } catch (e) {
        continue;
      }
    }
  }

  return new NextResponse("Not found", { status: 404 });
}
