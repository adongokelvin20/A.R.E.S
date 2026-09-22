"use client";

import { useEffect } from "react";

/**
 * Error boundary for the root layout — catches server component errors
 * and shows a friendly retry page with the actual error message (for debugging).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F0F2F5", padding: "24px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ maxWidth: "440px", width: "100%", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, margin: "0 auto 20px", borderRadius: "50%", background: "#075E54", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0A1626", marginBottom: 8 }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#666", marginBottom: 16 }}>
          We hit an unexpected issue. Try refreshing the page.
        </p>
        {/* Show the actual error message to help diagnose */}
        {error?.message && (
          <p style={{ fontSize: 11, fontFamily: "monospace", color: "#999", background: "#f5f5f5", padding: "8px 12px", borderRadius: "8px", marginBottom: 16, wordBreak: "break-word" }}>
            {error.message.slice(0, 200)}
          </p>
        )}
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              background: "#075E54",
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
          <a
            href="/auth"
            style={{
              background: "transparent",
              color: "#075E54",
              border: "1px solid #075E54",
              borderRadius: "12px",
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            Log out
          </a>
        </div>
      </div>
    </div>
  );
}
