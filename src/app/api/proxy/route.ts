/**
 * AI Proxy endpoint
 *
 * GET  /api/ai-proxy?messages=<base64-encoded-json>
 * POST /api/ai-proxy  { messages, temperature, max_tokens }
 *
 * The GET version works through the Z.ai gateway which blocks POST requests.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ZAI_CONFIG = {
  baseUrl: "https://internal-api.z.ai/v1",
  apiKey: "Z.ai",
  chatId: "chat-0eadb6df-900f-47f6-9675-3d6506fd0828",
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNmQ0ZTM4MTgtMGUwMy00Y2M5LThmNWMtNzY3ZWRjNDRmMWMwIiwiY2hhdF9pZCI6ImNoYXQtMGVhZGI2ZGYtOTAwZi00N2Y2LTk2NzUtM2Q2NTA2ZmQwODI4IiwicGxhdGZvcm0iOiJ6YWkifQ.Y-GA6Z2INh450ScozUl26SU4_Nt9I6ID6KnTEOVyxxo",
  userId: "6d4e3818-0e03-4cc9-8f5c-767edc44f1c0",
};

async function callZaiAPI(messages: any[], temperature?: number, max_tokens?: number) {
  const requestBody: any = {
    messages: messages || [],
    thinking: { type: "disabled" },
  };
  if (temperature !== undefined) requestBody.temperature = temperature;
  if (max_tokens !== undefined) requestBody.max_tokens = max_tokens;

  const response = await fetch(`${ZAI_CONFIG.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ZAI_CONFIG.apiKey}`,
      "X-Z-AI-From": "Z",
      "X-Chat-Id": ZAI_CONFIG.chatId,
      "X-User-Id": ZAI_CONFIG.userId,
      "X-Token": ZAI_CONFIG.token,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[AI Proxy] Z.ai API error:", response.status, text.slice(0, 200));
    throw new Error(`AI API error ${response.status}`);
  }

  return await response.json();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const encodedMessages = searchParams.get("messages");
    
    if (!encodedMessages) {
      return NextResponse.json({ status: "ok", service: "A.R.E.S. AI Proxy" });
    }

    // Decode base64 -> JSON
    const decoded = Buffer.from(encodedMessages, "base64").toString("utf-8");
    const body = JSON.parse(decoded);
    
    const temperature = body.temperature ? parseFloat(body.temperature) : undefined;
    const max_tokens = body.max_tokens ? parseInt(body.max_tokens) : undefined;
    
    const data = await callZaiAPI(body.messages, temperature, max_tokens);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[AI Proxy GET] error:", err?.message ?? err);
    return NextResponse.json({ error: "AI proxy failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await callZaiAPI(body.messages, body.temperature, body.max_tokens);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[AI Proxy POST] error:", err?.message ?? err);
    return NextResponse.json({ error: "AI proxy failed" }, { status: 500 });
  }
}
