/**
 * Store 404 page — shown when a customer visits a store link that doesn't exist.
 */
import Link from "next/link";

export default function StoreNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ares-mist px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ares-foam text-ares-sea-deep">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-ares-navy">Store not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This store doesn&apos;t exist or hasn&apos;t been set up yet. Check the link and try again.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-ares-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-ares-sea-deep"
        >
          Go to A.R.E.S.
        </Link>
      </div>
    </main>
  );
}
