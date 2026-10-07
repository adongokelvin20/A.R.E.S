import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDatabase } from "@/lib/db";
import { AresLanding } from "@/components/ares/landing";
import { AresAppShellClient } from "@/components/ares/app-shell-client";
import { getOrCreateSubscription, hasAccess } from "@/lib/paystack";

export const dynamic = "force-dynamic";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default async function Home() {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user?.businessId) {
      try { await ensureDatabase(); } catch {}

      // Look up the business — MUST include createdAt for the age check
      let business: any = null;
      try {
        if (db) {
          business = await db.business.findUnique({
            where: { id: session.user.businessId },
            select: { id: true, name: true, type: true, agentName: true, ownerFirstName: true, onboardedAt: true, createdAt: true, status: true },
          });
        }
      } catch (e) {
        console.error("[home] business lookup failed:", e);
      }

      if (business) {
        // Check if business is suspended by CEO
        if (business.status === "SUSPENDED") {
          return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
              <div className="max-w-md text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
                  <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Account Suspended</h1>
                <p className="mt-3 text-sm text-slate-500">{business.name} has been suspended by the system administrator. Please contact ChatBiz support to resolve this.</p>
                <a href="/auth?suspended=1" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Sign out</a>
              </div>
            </main>
          );
        }

        const needsOnboarding = !business.onboardedAt;

        // ===== SERVER-SIDE SUBSCRIPTION CHECK =====
        // This is the hard gate. No matter what happens, if the account is
        // older than 7 days AND there's no active subscription, the user
        // is LOCKED OUT.
        let accessGranted = false;
        let locked = false;

        // Step 1: Check the business age — if older than 7 days, they MUST have a subscription
        const businessAge = business.createdAt ? Date.now() - new Date(business.createdAt).getTime() : 0;
        const isOlderThan7Days = businessAge > SEVEN_DAYS_MS;

        // Step 2: Check subscription status
        let sub: any = null;
        try {
          sub = await getOrCreateSubscription(session.user.businessId, db);
        } catch (e) {
          console.error("[home] subscription check failed:", e);
        }

        // Step 3: Determine access
        if (sub) {
          // We have a subscription record — use hasAccess
          accessGranted = hasAccess(sub);
        } else {
          // No subscription record (DB error or table doesn't exist)
          // If the account is older than 7 days, LOCK THEM OUT
          // If newer than 7 days, give them the benefit of the doubt (trial)
          accessGranted = !isOlderThan7Days;
        }

        // Step 4: Final override — if the account is older than 7 days and
        // the subscription is not ACTIVE (or TRIAL with days left), lock them
        if (isOlderThan7Days) {
          if (!sub || (sub.status !== "ACTIVE" && !(sub.status === "TRIAL" && sub.trialEndsAt && new Date(sub.trialEndsAt) > new Date()))) {
            accessGranted = false;
          }
        }

        locked = !accessGranted;

        return (
          <AresAppShellClient
            businessId={session.user.businessId}
            businessName={session.user.businessName ?? business.name}
            businessType={session.user.businessType ?? business.type}
            ownerName={session.user.name ?? "Owner"}
            needsOnboarding={needsOnboarding}
            locked={locked}
          />
        );
      }
    }
  } catch (e) {
    console.error("[home] unexpected error:", e);
  }

  return <AresLanding />;
}
