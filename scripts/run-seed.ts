import { seedAresData } from "../src/lib/ares-seed";

(async () => {
  try {
    const result = await seedAresData();
    console.log("Seed result:", result);
    process.exit(0);
  } catch (e: any) {
    console.error("Seed failed:", e?.message ?? e);
    console.error(e?.stack);
    process.exit(1);
  }
})();
