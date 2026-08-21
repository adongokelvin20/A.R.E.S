import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { AresLanding } from "@/components/ares/landing";
import { AresAppShellClient } from "@/components/ares/app-shell-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user?.businessId) {
    const business = await db.business.findUnique({
      where: { id: session.user.businessId },
      select: { id: true, name: true, type: true, agentName: true, ownerFirstName: true, onboardedAt: true },
    });

    // Only show the dashboard if the business actually exists.
    // If the session is stale (business was deleted), show the landing page.
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
    // Stale session -- fall through to landing page.
  }

  return <AresLanding />;
}
