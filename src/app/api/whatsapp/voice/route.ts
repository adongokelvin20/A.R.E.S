/**
 * WhatsApp Voice Note Processing
 *
 * POST /api/whatsapp/voice
 *   { audioBase64, mimeType, conversationId, fromPhone }
 *
 * Converts voice notes to text using Z.ai ASR, then processes the text
 * through the normal chat flow.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getZaiClient } from "@/lib/ai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = session.user.businessId;

  try {
    const body = await req.json();
    const { audioBase64, mimeType = "audio/ogg", conversationId, fromPhone } = body;

    if (!audioBase64) {
      return NextResponse.json({ error: "No audio data" }, { status: 400 });
    }

    // Convert voice to text using Z.ai ASR
    let transcribedText = "";
    try {
      const zai = await getZaiClient();
      const asrResult = await zai.audio.asr.create({
        file_base64: audioBase64,
        model: "whisper-large-v3",
      });
      transcribedText = asrResult?.text || asrResult?.result || "";
    } catch (e: any) {
      console.error("[voice] ASR failed:", e?.message);
      return NextResponse.json({
        error: "Could not transcribe voice note",
        fallback: "I couldn't understand that voice note. Could you type it instead?",
      });
    }

    if (!transcribedText.trim()) {
      return NextResponse.json({
        transcribedText: "",
        fallback: "I couldn't hear what you said in that voice note. Mind typing it?",
      });
    }

    // Store the transcribed message
    let conversation = null;
    if (conversationId) {
      conversation = await db.conversation.findFirst({
        where: { id: conversationId, businessId },
      });
    }
    if (!conversation && fromPhone) {
      conversation = await db.conversation.findFirst({
        where: { businessId, customerPhone: fromPhone, status: "OPEN" },
      });
    }
    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          businessId,
          channel: "WHATSAPP",
          customerPhone: fromPhone,
          status: "OPEN",
        },
      });
    }

    await db.message.create({
      data: {
        conversationId: conversation.id,
        role: "CUSTOMER",
        content: `[Voice note] ${transcribedText}`,
        metadata: JSON.stringify({ type: "voice", originalTranscript: transcribedText }),
      },
    });

    return NextResponse.json({
      transcribedText,
      conversationId: conversation.id,
    });
  } catch (err: any) {
    console.error("[voice] error:", err);
    return NextResponse.json(
      { error: "Voice processing failed", detail: String(err?.message ?? err).slice(0, 100) },
      { status: 500 }
    );
  }
}
