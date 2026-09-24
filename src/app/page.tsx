import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDatabase } from "@/lib/db";
import { AresLanding } from "@/components/ares/landing";
import { AresAppShellClient } from "@/components/ares/app-shell-client";
import { getOrCreateSubscription, hasAccess } from "@/lib/paystack";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user?.businessId) {
      try { await ensureDatabase(); } catch {}

      // Look up the business
      let business: any = null;
      try {
        if (db) {
          business = await db.business.findUnique({
            where: { id: session.user.businessId },
            select: { id: true, name: true, type: true, agentName: true, ownerFirstName: true, onboardedAt: true, createdAt: true },
          });
        }
      } catch (e) {
        console.error("[home] business lookup failed:", e);
      }

      if (business) {
        const needsOnboarding = !business.onboardedAt;

        // ===== SERVER-SIDE SUBSCRIPTION CHECK =====
        // This is the critical gate — if the subscription is expired, the user
        // CANNOT access the dashboard. They see the pricing page instead.
        let sub: any = null;
        let accessGranted = true; // default to true so DB errors don't lock people out

        try {
          sub = await getOrCreateSubscription(session.user.businessId, db);
          accessGranted = hasAccess(sub);
        } catch (e) {
          console.error("[home] subscription check failed:", e);
          // On error, check manually: if the business is older than 7 days and
          // has no active subscription, lock them out.
          if (business.createdAt) {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            if (new Date(business.createdAt) < sevenDaysAgo) {
              accessGranted = false; // account is older than 7 days — lock it
            }
          }
        }

        // If access is denied, render the app shell with a "locked" flag
        // so the client shows the pricing modal (which can't be closed)
        if (!accessGranted) {
          return (
            <AresAppShellClient
              businessId={session.user.businessId}
              businessName={session.user.businessName ?? business.name}
              businessType={session.user.businessType ?? business.type}
              ownerName={session.user.name ?? "Owner"}
              needsOnboarding={needsOnboarding}
              locked={true}
            />
          );
        }

        return (
          <AresAppShellClient
            businessId={session.user.businessId}
            businessName={session.user.businessName ?? business.name}
            businessType={session.user.businessType ?? business.type}
            ownerName={session.user.name ?? "Owner"}
            needsOnboarding={needsOnboarding}
            locked={false}
          />
        );
      }
    }
  } catch (e) {
    console.error("[home] unexpected error:", e);
  }

  return <AresLanding />;
}
