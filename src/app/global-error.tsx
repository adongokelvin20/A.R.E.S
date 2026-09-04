"use client";

/**
 * Global error boundary — catches any uncaught server-side exception
 * and shows a friendly page instead of the generic "Application error" message.
 * The user can refresh to retry.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F0F2F5", padding: "24px" }}>
          <div style={{ maxWidth: "440px", width: "100%", textAlign: "center" }}>
            <div style={{ width: "64", height: "64", margin: "0 auto 20px", borderRadius: "50%", background: "#075E54", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#0A1626", marginBottom: "8px" }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#666", marginBottom: "24px" }}>
              We hit an unexpected issue. This usually resolves on its own — try refreshing the page.
            </p>
            <button
              onClick={reset}
              style={{
                background: "#075E54",
                color: "white",
                border: "none",
                borderRadius: "12px",
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            {error?.digest && (
              <p style={{ marginTop: "16px", fontSize: "11px", color: "#999" }}>
                Error: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
