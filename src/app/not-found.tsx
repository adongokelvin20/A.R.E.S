import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="max-w-md text-center">
        <div className="font-mono text-6xl font-bold text-ares-sea/20">404</div>
        <h1 className="mt-4 text-xl font-semibold text-ares-navy">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-ares-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-ares-sea-deep"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
