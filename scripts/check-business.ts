import { db } from "../src/lib/db";

(async () => {
  const b = await db.business.findFirst({ where: { slug: { contains: "test" } } });
  console.log(JSON.stringify(b, null, 2));
  process.exit(0);
})();
