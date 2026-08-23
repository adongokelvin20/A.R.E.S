// Minimal AI proxy server
// Runs on port 3030, forwards requests to Z.ai internal API

const PORT = 3030;

const ZAI_BASE_URL = "https://internal-api.z.ai/v1";
const ZAI_API_KEY = "Z.ai";
const ZAI_CHAT_ID = "chat-0eadb6df-900f-47f6-9675-3d6506fd0828";
const ZAI_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNmQ0ZTM4MTgtMGUwMy00Y2M5LThmNWMtNzY3ZWRjNDRmMWMwIiwiY2hhdF9pZCI6ImNoYXQtMGVhZGI2ZGYtOTAwZi00N2Y2LTk2NzUtM2Q2NTA2ZmQwODI4IiwicGxhdGZvcm0iOiJ6YWkifQ.Y-GA6Z2INh450ScozUl26SU4_Nt9I6ID6KnTEOVyxxo";
const ZAI_USER_ID = "6d4e3818-0e03-4cc9-8f5c-767edc44f1c0";

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    // Handle CORS
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const url = new URL(req.url);

    // Health check
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // AI proxy
    if (url.pathname === "/chat") {
      try {
        let body;
        if (req.method === "GET") {
          const encoded = url.searchParams.get("messages");
          if (!encoded) {
            return new Response(JSON.stringify({ error: "No messages param" }), {
              status: 400,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            });
          }
          body = JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
        } else {
          body = await req.json();
        }

        const requestBody: any = {
          messages: body.messages || [],
          thinking: { type: "disabled" },
        };
        if (body.temperature !== undefined) requestBody.temperature = body.temperature;
        if (body.max_tokens !== undefined) requestBody.max_tokens = body.max_tokens;

        const response = await fetch(`${ZAI_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${ZAI_API_KEY}`,
            "X-Z-AI-From": "Z",
            "X-Chat-Id": ZAI_CHAT_ID,
            "X-User-Id": ZAI_USER_ID,
            "X-Token": ZAI_TOKEN,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const text = await response.text();
          return new Response(JSON.stringify({ error: `AI API error ${response.status}` }), {
            status: 502,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err?.message ?? "Proxy failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`AI Proxy server running on port ${PORT}`);
