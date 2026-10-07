import { NextRequest, NextResponse } from "next/server";
import { getVisionClient } from "@/lib/ai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/debug/vlm-test
 *
 * Quick VLM smoke test — checks whether the configured vision client is working.
 * No body needed. Returns provider + sample analysis output.
 */
export async function GET(req: NextRequest) {
  // A tiny 1x1 transparent PNG (base64).
  const tinyPng =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

  try {
    const vision = await getVisionClient() as any;
    const provider = vision._provider || "unknown";
    const analysis = await vision.analyze(
      tinyPng,
      `Describe this image in one short sentence.\nFormat:\nDESCRIPTION: <text>`
    );
    return NextResponse.json({
      ok: true,
      provider,
      analysis,
    });
  } catch (e: any) {
    console.error("[vlm-test] failed:", e?.message);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "VLM test failed" },
      { status: 500 }
    );
  }
}
