import { db } from "../src/lib/db";

(async () => {
  const b = await db.business.findFirst({ where: { name: "City Clinic" }, select: { agentLearnings: true } });
  console.log("Learnings:", b?.agentLearnings);
  process.exit(0);
})();
