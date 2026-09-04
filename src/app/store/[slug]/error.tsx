"use client";

/**
 * Store page error boundary — if the store page throws (DB error, etc),
 * customers see a friendly "store warming up" page instead of a crash.
 */
export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F0F2F5", padding: "24px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ maxWidth: "440px", width: "100%", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, margin: "0 auto 20px", borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#075E54", marginBottom: 8 }}>
          Store is warming up
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#666", marginBottom: 24 }}>
          We&apos;re getting things ready. Please refresh in a moment.
        </p>
        <button
          onClick={reset}
          style={{
            background: "#25D366",
            color: "white",
            border: "none",
            borderRadius: "12px",
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </div>
    </main>
  );
}
