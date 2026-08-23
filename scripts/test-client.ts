import { getZaiClient } from "../src/lib/ai-client";

(async () => {
  try {
    const zai = await getZaiClient();
    const res = await zai.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant. Reply in one sentence." },
        { role: "user", content: "Say hello" },
      ],
    });
    console.log("Reply:", res?.choices?.[0]?.message?.content);
    console.log("SUCCESS");
  } catch (e: any) {
    console.log("ERROR:", e?.message ?? e);
  }
  process.exit(0);
})();
