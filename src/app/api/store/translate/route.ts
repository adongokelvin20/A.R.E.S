/**
 * POST /api/store/translate
 *   { text: "Bonjour", sourceLang: "french", targetLang: "english" }
 *
 * Translates text using Cloudflare Workers AI (m2m100 model).
 * Returns translated text.
 *
 * Used to auto-translate customer messages (French/Twi/Hausa → English)
 * and translate the agent's reply back to the customer's language.
 */
import { NextRequest, NextResponse } from "next/server";
import { cloudflareTranslate } from "@/lib/ai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Map of language codes to full names (m2m100 uses full names)
const LANG_MAP: Record<string, string> = {
  en: "english", english: "english",
  fr: "french", french: "french",
  es: "spanish", spanish: "spanish",
  de: "german", german: "german",
  pt: "portuguese", portuguese: "portuguese",
  ar: "arabic", arabic: "arabic",
  hi: "hindi", hindi: "hindi",
  zh: "chinese", chinese: "chinese",
  ja: "japanese", japanese: "japanese",
  ko: "korean", korean: "korean",
  ru: "russian", russian: "russian",
  it: "italian", italian: "italian",
  nl: "dutch", dutch: "dutch",
  tr: "turkish", turkish: "turkish",
  sw: "swahili", swahili: "swahili",
  ha: "hausa", hausa: "hausa",
  yo: "yoruba", yoruba: "yoruba",
  ig: "igbo", igbo: "igbo",
  tw: "twi", twi: "twi",
  am: "amharic", amharic: "amharic",
  zu: "zulu", zulu: "zulu",
  af: "afrikaans", afrikaans: "afrikaans",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, sourceLang, targetLang } = body as {
      text?: string;
      sourceLang?: string;
      targetLang?: string;
    };

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const source = LANG_MAP[(sourceLang || "en").toLowerCase()] || "english";
    const target = LANG_MAP[(targetLang || "en").toLowerCase()] || "english";

    const translated = await cloudflareTranslate(text.slice(0, 500), source, target);

    if (!translated) {
      return NextResponse.json({
        error: "Translation not available right now.",
      }, { status: 503 });
    }

    return NextResponse.json({
      translated: translated,
      sourceLang: source,
      targetLang: target,
    });
  } catch (e: any) {
    console.error("[translate] error:", e?.message);
    return NextResponse.json({
      error: "Couldn't translate. Please try again.",
    }, { status: 500 });
  }
}
