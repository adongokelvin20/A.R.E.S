"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-ares-navy">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-xl bg-ares-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-ares-sea-deep"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-ares-line bg-white px-5 py-2.5 text-sm font-semibold text-ares-navy hover:border-ares-sea/40"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
