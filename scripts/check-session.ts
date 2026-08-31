import { db } from "../src/lib/db";

(async () => {
  const users = await db.user.findMany({ select: { email: true, businessId: true } });
  const businesses = await db.business.findMany({ select: { id: true, name: true } });
  console.log("Users:", users.length);
  for (const u of users) console.log(`  ${u.email} → ${u.businessId}`);
  console.log("Businesses:", businesses.length);
  for (const b of businesses) console.log(`  ${b.id} → ${b.name}`);
  process.exit(0);
})();
