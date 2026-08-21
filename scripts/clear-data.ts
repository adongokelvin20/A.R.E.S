/**
 * Wipe ALL business data — leaves the database empty and ready for real signups.
 */
import { db } from "../src/lib/db";

(async () => {
  // Delete in dependency order (children first).
  // Prisma cascade handles most, but we delete explicitly to be safe across SQLite.
  await db.message.deleteMany();
  await db.conversation.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.product.deleteMany();
  await db.customer.deleteMany();
  await db.knowledgeEntry.deleteMany();
  await db.auditLog.deleteMany();
  await db.alert.deleteMany();
  await db.insight.deleteMany();
  await db.automation.deleteMany();
  await db.integration.deleteMany();
  await db.user.deleteMany();
  await db.business.deleteMany();

  // Count remaining
  const counts = {
    businesses: await db.business.count(),
    users: await db.user.count(),
    products: await db.product.count(),
    orders: await db.order.count(),
    customers: await db.customer.count(),
  };
  console.log("Database cleared. Remaining:", counts);
  process.exit(0);
})().catch((e) => {
  console.error("Failed to clear DB:", e);
  process.exit(1);
});
