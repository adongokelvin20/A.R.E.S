/**
 * POST /api/store/transcribe
 *   { audio: "data:audio/webm;base64,..." }
 *
 * Receives a voice note from the store chat, transcribes it, and returns text.
 *
 * Provider chain:
 *   1. Groq Whisper (whisper-large-v3) — FREE, fast, accepts webm/mp3/wav/m4a
 *   2. Fallback: ask customer to type
 *
 * Required env var: GROQ_API_KEY (get from https://console.groq.com/keys)
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

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return NextResponse.json({
        text: "",
        error: "Voice transcription is not configured. Please type your message.",
        provider: "none",
      });
    }

    // Parse the data URL: data:audio/webm;base64,AAAA...
    const match = audio.match(/^data:audio\/([\w+]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Invalid audio format" }, { status: 400 });
    }
    const audioFormat = match[1]; // webm, mp3, wav, m4a, ogg
    const base64Data = match[2];
    const audioBuffer = Buffer.from(base64Data, "base64");

    // Map browser format to file extension
    const ext = audioFormat === "webm" ? "webm"
               : audioFormat === "mp4" ? "mp4"
               : audioFormat === "mpeg" ? "mp3"
               : audioFormat === "ogg" ? "ogg"
               : audioFormat === "wav" ? "wav"
               : "webm";

    // Build multipart form for Groq
    const boundary = `----chatbiz-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const formData = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="model"\r\n\r\n`),
      Buffer.from(`whisper-large-v3\r\n`),
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="file"; filename="audio.${ext}"\r\n`),
      Buffer.from(`Content-Type: audio/${audioFormat}\r\n\r\n`),
      audioBuffer,
      Buffer.from(`\r\n--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="response_format"\r\n\r\n`),
      Buffer.from(`json\r\n`),
      Buffer.from(`--${boundary}--\r\n`),
    ]);

    // Try Groq Whisper
    try {
      const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[transcribe] Groq error ${response.status}:`, errText.slice(0, 200));
        throw new Error(`Groq ${response.status}`);
      }

      const result = await response.json() as { text?: string };
      const text = (result.text || "").trim();

      if (text && text.length > 0) {
        console.log(`[transcribe] Groq Whisper result: "${text.slice(0, 100)}"`);
        return NextResponse.json({ text, provider: "groq" });
      }
    } catch (e: any) {
      console.error("[transcribe] Groq Whisper failed:", e?.message);
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
