/**
 * POST /api/store/tts
 *   { text: "Hello, welcome!", language: "en" }
 *
 * Converts text to speech using Cloudflare Workers AI (MelTTS).
 * Returns base64 audio that the frontend can play.
 *
 * Used to let the agent "speak" its replies — customers can hear
 * the agent confirm their order.
 */
import { NextRequest, NextResponse } from "next/server";
import { cloudflareTTS } from "@/lib/ai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, language } = body as { text?: string; language?: string };

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Limit text length to avoid timeout (TTS takes ~2s per 100 chars)
    const truncatedText = text.slice(0, 500);

    const audioBase64 = await cloudflareTTS(truncatedText, language || "en");

    if (!audioBase64) {
      return NextResponse.json({
        error: "Voice is not available right now. Please try again.",
      }, { status: 503 });
    }

    return NextResponse.json({
      audio: audioBase64,
      format: "wav",
    });
  } catch (e: any) {
    console.error("[tts] error:", e?.message);
    return NextResponse.json({
      error: "Couldn't generate voice. Please try again.",
    }, { status: 500 });
  }
}
