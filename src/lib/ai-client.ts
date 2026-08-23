/**
 * A.R.E.S. AI Client
 *
 * Uses the z-ai-web-dev-sdk. On Vercel, writes the config file to /tmp
 * at runtime since the filesystem is read-only except for /tmp.
 */

import { writeFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const ZAI_CONFIG = {
  baseUrl: "https://internal-api.z.ai/v1",
  apiKey: "Z.ai",
  chatId: "chat-0eadb6df-900f-47f6-9675-3d6506fd0828",
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNmQ0ZTM4MTgtMGUwMy00Y2M5LThmNWMtNzY3ZWRjNDRmMWMwIiwiY2hhdF9pZCI6ImNoYXQtMGVhZGI2ZGYtOTAwZi00N2Y2LTk2NzUtM2Q2NTA2ZmQwODI4IiwicGxhdGZvcm0iOiJ6YWkifQ.Y-GA6Z2INh450ScozUl26SU4_Nt9I6ID6KnTEOVyxxo",
  userId: "6d4e3818-0e03-4cc9-8f5c-767edc44f1c0",
};

let initialized = false;

function ensureConfigFile() {
  if (initialized) return;

  const configStr = JSON.stringify(ZAI_CONFIG);

  // Write to multiple locations the SDK checks:
  // 1. Current working directory
  try {
    if (!existsSync(join(process.cwd(), ".z-ai-config"))) {
      writeFileSync(join(process.cwd(), ".z-ai-config"), configStr);
    }
  } catch {}

  // 2. /tmp (always writable on Vercel)
  try {
    writeFileSync(join(tmpdir(), ".z-ai-config"), configStr);
  } catch {}

  // 3. Home directory
  const home = process.env.HOME || process.env.HOMEPATH || tmpdir();
  try {
    writeFileSync(join(home, ".z-ai-config"), configStr);
  } catch {}

  // 4. /etc (works in sandbox, might not on Vercel)
  try {
    writeFileSync("/etc/.z-ai-config", configStr);
  } catch {}

  // Set HOME to /tmp if not set (Vercel might not set it)
  if (!process.env.HOME) {
    process.env.HOME = tmpdir();
  }

  initialized = true;
}

export async function getZaiClient() {
  ensureConfigFile();
  const ZAI = (await import("z-ai-web-dev-sdk")).default;
  return ZAI.create();
}
