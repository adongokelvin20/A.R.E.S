/**
 * POST /api/store/transcribe
 *   { audio: "data:audio/webm;base64,..." }
 *
 * Receives a voice note from the store chat, transcribes it using the Z.ai ASR SDK,
 * and returns the transcribed text. The text is then sent to the chat endpoint
 * as a normal text message.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audio } = body as { audio?: string };

    if (!audio || !audio.startsWith("data:audio/")) {
      return NextResponse.json({ error: "Valid audio data required" }, { status: 400 });
    }

    // Try Z.ai ASR first (free, already in skills)
    try {
      const ZAIModule = await import("z-ai-web-dev-sdk");
      const ZAI = ZAIModule.default;
      const ZAI_CONFIG = {
        baseUrl: "https://internal-api.z.ai/v1",
        apiKey: "Z.ai",
        chatId: "chat-0eadb6df-900f-47f6-9675-3d6506fd0828",
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNmQ0ZTM4MTgtMGUwMy00Y2M5LThmNWMtNzY3ZWRjNDRmMWMwIiwiY2hhdF9pZCI6ImNoYXQtMGVhZGI2ZGYtOTAwZi00N2Y2LTk2NzUtM2Q2NTA2ZmQwODI4IiwicGxhdGZvcm0iOiJ6YWkifQ.Y-GA6Z2INh450ScozUl26SU4_Nt9I6ID6KnTEOVyxxo",
        userId: "6d4e3818-0e03-4cc9-8f5c-767edc44f1c0",
      };
      const zaiClient = new ZAI(ZAI_CONFIG);

      // Convert data URL to base64
      const base64Data = audio.split(",")[1];
      const audioBuffer = Buffer.from(base64Data, "base64");

      // Use Z.ai ASR
      const result = await (zaiClient as any).asr.transcribe(audioBuffer, { format: "webm" });
      const text = (result as any)?.text?.trim() ?? "";

      if (text && text.length > 0) {
        console.log(`[transcribe] Z.ai ASR result: "${text.slice(0, 100)}"`);
        return NextResponse.json({ text, provider: "zai" });
      }
    } catch (e: any) {
      console.error("[transcribe] Z.ai ASR failed:", e?.message);
    }

    // Fallback: return a message asking the customer to type
    return NextResponse.json({
      text: "",
      error: "Couldn't transcribe the voice note. Please type your message instead.",
      provider: "none",
    });
  } catch (e: any) {
    console.error("[transcribe] error:", e?.message);
    return NextResponse.json({
      text: "",
      error: "Couldn't process the voice note. Please type your message.",
    }, { status: 500 });
  }
}
