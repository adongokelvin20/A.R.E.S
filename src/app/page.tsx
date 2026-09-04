import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDatabase } from "@/lib/db";
import { AresLanding } from "@/components/ares/landing";
import { AresAppShellClient } from "@/components/ares/app-shell-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user?.businessId) {
    // Ensure DB tables exist (handles fresh deployments)
    try {
      await ensureDatabase();
    } catch (e) {
      console.error("[home] ensureDatabase failed:", e);
    }

    // Look up the business — wrapped in try/catch so a DB error never crashes
    // the entire page (shows the landing page instead of a 500)
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

  return <AresLanding />;
}
