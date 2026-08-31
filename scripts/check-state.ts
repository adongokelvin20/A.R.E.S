import { db } from "../src/lib/db";

(async () => {
  const convos = await db.conversation.findMany();
  console.log("Conversations:", convos.length);
  for (const c of convos) console.log(`  channel=${c.channel} status=${c.status} name=${c.customerName}`);
  const orders = await db.order.findMany();
  console.log("Orders:", orders.length);
  for (const o of orders) console.log(`  status=${o.status} total=${o.total} channel=${o.channel}`);
  process.exit(0);
})();
