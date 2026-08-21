import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AresAuth } from "@/components/ares/auth";

export const dynamic = "force-dynamic";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const session = await getServerSession(authOptions);

  // Only redirect to the app if the business actually exists in the DB.
  // If the session is stale (business was deleted), show the auth page
  // so the user can sign up / log in fresh.
  if (session?.user?.businessId) {
    const business = await db.business.findUnique({
      where: { id: session.user.businessId },
      select: { id: true },
    });
    if (business) {
      redirect("/");
    }
    // Business doesn't exist -- the session is stale. Fall through to show auth.
  }

  const params = await searchParams;
  const initialMode = params.mode === "login" ? "login" : "signup";

  return <AresAuth initialMode={initialMode} />;
}
