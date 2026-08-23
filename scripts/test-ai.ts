import { getZaiClient } from "../src/lib/ai-client";

(async () => {
  try {
    const zai = await getZaiClient();
    const res = await zai.chat.completions.create({
      messages: [{ role: "user", content: "Say hello in 3 words" }],
    });
    const reply = res?.choices?.[0]?.message?.content;
    console.log("Reply:", reply);
  } catch (e: any) {
    console.log("ERROR:", e?.message ?? e);
    console.log("STACK:", e?.stack?.slice(0, 500));
  }
  process.exit(0);
})();
