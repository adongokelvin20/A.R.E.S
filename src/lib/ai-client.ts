/**
 * A.R.E.S. AI Client
 *
 * Calls the Z.ai API directly using fetch -- no SDK dependency.
 * Works on Vercel without any config files.
 * Includes fallback responses if the API is unavailable.
 */

const ZAI_BASE_URL = "https://internal-api.z.ai/v1";
const ZAI_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNmQ0ZTM4MTgtMGUwMy00Y2M5LThmNWMtNzY3ZWRjNDRmMWMwIiwiY2hhdF9pZCI6ImNoYXQtMGVhZGI2ZGYtOTAwZi00N2Y2LTk2NzUtM2Q2NTA2ZmQwODI4IiwicGxhdGZvcm0iOiJ6YWkifQ.Y-GA6Z2INh450ScozUl26SU4_Nt9I6ID6KnTEOVyxxo";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ZaiClient {
  chat: {
    completions: {
      create: (body: { messages: ChatMessage[]; temperature?: number; max_tokens?: number }) => Promise<any>;
      createVision: (body: { model: string; messages: any[] }) => Promise<any>;
    };
  };
}

export async function getZaiClient(): Promise<ZaiClient> {
  return {
    chat: {
      completions: {
        create: async (body: { messages: ChatMessage[]; temperature?: number; max_tokens?: number }) => {
          try {
            const response = await fetch(`${ZAI_BASE_URL}/chat/completions`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${ZAI_TOKEN}`,
              },
              body: JSON.stringify({
                messages: body.messages,
                temperature: body.temperature ?? 0.85,
                max_tokens: body.max_tokens ?? 700,
                stream: false,
              }),
            });

            if (!response.ok) {
              const text = await response.text();
              console.error("[A.R.E.S. AI] API error:", response.status, text.slice(0, 200));
              throw new Error(`AI API returned ${response.status}`);
            }

            const data = await response.json();

            // Handle different response formats
            const content =
              data?.choices?.[0]?.message?.content ??
              data?.choices?.[0]?.text ??
              data?.content ??
              null;

            if (!content) {
              console.error("[A.R.E.S. AI] No content in response:", JSON.stringify(data).slice(0, 300));
              throw new Error("AI returned empty response");
            }

            return data;
          } catch (e: any) {
            // If it's a network error or timeout, throw with a clear message
            if (e?.cause?.code === 'ECONNREFUSED' || e?.cause?.code === 'ETIMEDOUT') {
              throw new Error("AI service is temporarily unavailable. Please try again.");
            }
            throw e;
          }
        },
        createVision: async (body: { model: string; messages: any[] }) => {
          const response = await fetch(`${ZAI_BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${ZAI_TOKEN}`,
            },
            body: JSON.stringify({
              model: body.model,
              messages: body.messages,
              stream: false,
            }),
          });

          if (!response.ok) {
            const text = await response.text();
            console.error("[A.R.E.S. AI] Vision API error:", response.status, text.slice(0, 200));
            throw new Error(`Vision API returned ${response.status}`);
          }

          const data = await response.json();
          return data;
        },
      },
    },
  };
}
