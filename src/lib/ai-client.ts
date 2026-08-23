/**
 * A.R.E.S. AI Client
 *
 * Uses the z-ai-web-dev-sdk with config injected directly into the constructor,
 * completely bypassing the file-based config loading that fails on Vercel.
 */

const ZAI_CONFIG = {
  baseUrl: "https://internal-api.z.ai/v1",
  apiKey: "Z.ai",
  chatId: "chat-0eadb6df-900f-47f6-9675-3d6506fd0828",
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNmQ0ZTM4MTgtMGUwMy00Y2M5LThmNWMtNzY3ZWRjNDRmMWMwIiwiY2hhdF9pZCI6ImNoYXQtMGVhZGI2ZGYtOTAwZi00N2Y2LTk2NzUtM2Q2NTA2ZmQwODI4IiwicGxhdGZvcm0iOiJ6YWkifQ.Y-GA6Z2INh450ScozUl26SU4_Nt9I6ID6KnTEOVyxxo",
  userId: "6d4e3818-0e03-4cc9-8f5c-767edc44f1c0",
};

let clientInstance: any = null;

export async function getZaiClient() {
  if (clientInstance) return clientInstance;

  // Import the ZAI class directly
  const ZAIModule = await import("z-ai-web-dev-sdk");
  const ZAI = ZAIModule.default;

  // Call the constructor directly with our config object.
  // This completely bypasses the loadConfig() file-reading logic
  // that fails on Vercel (where /etc/.z-ai-config doesn't exist).
  clientInstance = new ZAI(ZAI_CONFIG);

  return clientInstance;
}
