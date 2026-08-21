/**
 * A.R.E.S. AI Client
 *
 * Initializes the z-ai-web-dev-sdk. The .z-ai-config file is committed
 * to the repo so it works on Vercel without manual setup.
 */
import { existsSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let initialized = false;

export async function getZaiClient() {
  if (!initialized) {
    // Check if config file exists in the project root (committed)
    const projectConfig = join(process.cwd(), ".z-ai-config");

    if (!existsSync(projectConfig)) {
      // Fallback: create from environment variables if available
      const config = {
        baseUrl: process.env.ZAI_BASE_URL || "https://internal-api.z.ai/v1",
        apiKey: process.env.ZAI_API_KEY || "Z.ai",
        chatId: process.env.ZAI_CHAT_ID || "",
        token: process.env.ZAI_TOKEN || "",
        userId: process.env.ZAI_USER_ID || "",
      };

      // Write to /tmp (writable on Vercel)
      const tmpConfig = join(tmpdir(), ".z-ai-config");
      writeFileSync(tmpConfig, JSON.stringify(config));

      // Also try home directory
      try {
        writeFileSync(join(process.env.HOME || tmpdir(), ".z-ai-config"), JSON.stringify(config));
      } catch {}
    }

    initialized = true;
  }

  const ZAI = (await import("z-ai-web-dev-sdk")).default;
  return ZAI.create();
}
