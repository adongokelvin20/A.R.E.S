import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AresAuth } from "@/components/ares/auth";

export const dynamic = "force-dynamic";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; suspended?: string }>;
}) {
  const session = await getServerSession(authOptions);

  // Check for ?suspended=1 query param (set when login fails due to suspension)
  const params = await searchParams;
  if (params.suspended === "1") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
            <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Account Suspended</h1>
          <p className="mt-3 text-sm text-slate-500">
            This account has been suspended by the system administrator.
            If you believe this is an error, please contact ChatBiz support.
          </p>
          <a href="/auth" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
            Try different account
          </a>
          <p className="mt-8 text-xs text-slate-300">ChatBiz by Kevtech Corporation</p>
        </div>
      </main>
    );
  }

  if (session?.user?.businessId) {
    const business = await db.business.findUnique({
      where: { id: session.user.businessId },
      select: { id: true, status: true, name: true },
    });

    if (business && business.status !== "SUSPENDED") {
      redirect("/");
    }

    // Business is suspended — show the suspended page
    if (business?.status === "SUSPENDED") {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
              <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Account Suspended</h1>
            <p className="mt-3 text-sm text-slate-500">
              {business.name} has been suspended by the system administrator.
              Please contact ChatBiz support to resolve this.
            </p>
            <a href="/auth?suspended=1" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
              Sign out
            </a>
          </div>
        </main>
      );
    }
  }

  const initialMode = params.mode === "login" ? "login" : "signup";
  return <AresAuth initialMode={initialMode} />;
}
