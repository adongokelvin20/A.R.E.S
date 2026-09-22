import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDatabase } from "@/lib/db";
import { AresLanding } from "@/components/ares/landing";
import { AresAppShellClient } from "@/components/ares/app-shell-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Wrap EVERYTHING in a try/catch so no server-side error ever shows
  // the "unexpected error" page — fall back to the landing page instead.
  try {
    const session = await getServerSession(authOptions);

    if (session?.user?.businessId) {
      // Ensure DB tables exist (handles fresh deployments)
      try {
        await ensureDatabase();
      } catch (e) {
        console.error("[home] ensureDatabase failed:", e);
      }

      // Look up the business — wrapped in try/catch so a DB error never crashes
      let business: any = null;
      try {
        if (db) {
          business = await db.business.findUnique({
            where: { id: session.user.businessId },
            select: { id: true, name: true, type: true, agentName: true, ownerFirstName: true, onboardedAt: true },
          });
        }
      } catch (e) {
        console.error("[home] business lookup failed:", e);
      }

      // Only show the dashboard if the business actually exists.
      if (business) {
        const needsOnboarding = !business.onboardedAt;

        return (
          <AresAppShellClient
            businessId={session.user.businessId}
            businessName={session.user.businessName ?? business.name}
            businessType={session.user.businessType ?? business.type}
            ownerName={session.user.name ?? "Owner"}
            needsOnboarding={needsOnboarding}
          />
        );
      }
      // Stale session or DB error -- fall through to landing page.
    }
  } catch (e) {
    // If anything throws (auth, DB, etc.), show the landing page instead of crashing
    console.error("[home] unexpected error:", e);
  }

  return <AresLanding />;
}
