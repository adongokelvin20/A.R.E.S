"use client";

import { useState, useCallback, useEffect } from "react";
import { AresAppShell } from "./app-shell";

/**
 * Client wrapper around the app shell. Handles post-onboarding reload
 * so the server-rendered session picks up the new business type.
 */
export function AresAppShellClient(props: {
  businessId: string;
  businessName: string;
  businessType: string;
  ownerName: string;
  needsOnboarding: boolean;
}) {
  const [needsOnboard, setNeedsOnboard] = useState(props.needsOnboarding);

  const handleOnboarded = useCallback(() => {
    // Reload the page so server components pick up the updated business type
    window.location.reload();
  }, []);

  // Periodically refresh the session claim if needed (no-op for now)
  useEffect(() => {
    if (!needsOnboard) return;
    // No polling -- the onboarding modal will call handleOnboarded on completion.
  }, [needsOnboard]);

  return (
    <AresAppShell
      businessId={props.businessId}
      businessName={props.businessName}
      businessType={props.businessType}
      ownerName={props.ownerName}
      needsOnboarding={needsOnboard}
      onOnboarded={handleOnboarded}
    />
  );
}
