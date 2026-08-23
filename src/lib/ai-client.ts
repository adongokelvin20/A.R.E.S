/**
 * A.R.E.S. AI Client
 *
 * Uses the z-ai-web-dev-sdk with the config injected directly,
 * bypassing the file-based config loading (which fails on Vercel).
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

  // Try to write config file to all locations the SDK checks
  const { writeFileSync, existsSync } = await import("fs");
  const { join } = await import("path");
  const { tmpdir } = await import("os");

  const configStr = JSON.stringify(ZAI_CONFIG);

  // Write to cwd
  try { writeFileSync(join(process.cwd(), ".z-ai-config"), configStr); } catch {}

  // Write to home
  try {
    const home = process.env.HOME || process.env.HOMEPATH || tmpdir();
    writeFileSync(join(home, ".z-ai-config"), configStr);
  } catch {}

  // Write to /etc
  try { writeFileSync("/etc/.z-ai-config", configStr); } catch {}

  // Set HOME env var to tmpdir if not set
  if (!process.env.HOME) {
    process.env.HOME = tmpdir();
    // Write config to tmpdir as well
    try { writeFileSync(join(tmpdir(), ".z-ai-config"), configStr); } catch {}
  }

  // Now try to create the client
  const ZAIModule = await import("z-ai-web-dev-sdk");
  const ZAI = ZAIModule.default;

  try {
    clientInstance = await ZAI.create();
    return clientInstance;
  } catch (fileError: any) {
    // If file-based config fails, manually create a client by
    // calling the internal constructor with our config directly
    console.log("[A.R.E.S. AI] File config failed, using direct injection");

    // The SDK's ZAI class has a private constructor, but we can
    // create an instance by accessing the class prototype
    try {
      // Try creating with a mock that bypasses loadConfig
      const zaiInstance = Object.create(ZAI.prototype);

      // Set the config directly on the instance
      zaiInstance.config = ZAI_CONFIG;

      // Initialize the chat/audio/images/video/async/functions APIs
      // by calling the same methods the constructor would
      const { createChatCompletion, createChatCompletionVision } = zaiInstance;
      
      // Rebuild the client structure manually
      zaiInstance.chat = {
        completions: {
          create: (body: any) => createChatCompletion.call(zaiInstance, body),
          createVision: (body: any) => createChatCompletionVision.call(zaiInstance, body),
        },
      };

      clientInstance = zaiInstance;
      return clientInstance;
    } catch (injectError: any) {
      console.error("[A.R.E.S. AI] Direct injection also failed:", injectError?.message);
      throw injectError;
    }
  }
}
