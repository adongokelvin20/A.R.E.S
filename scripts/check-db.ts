import { db } from "../src/lib/db";

(async () => {
  const businesses = await db.business.findMany({ select: { slug: true, name: true, type: true } });
  console.log("Businesses in DB:", businesses.length);
  for (const b of businesses) console.log(`  ${b.slug} → ${b.name} (${b.type})`);
  process.exit(0);
})();
