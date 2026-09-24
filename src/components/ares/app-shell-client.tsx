"use client";

import { useState, useCallback, useEffect } from "react";
import { AresAppShell } from "./app-shell";

/**
 * Client wrapper around the app shell. Handles post-onboarding reload
 * so the server-rendered session picks up the new business type.
 *
 * The `locked` prop is set server-side when the subscription is expired.
 * When locked, the dashboard shows ONLY the pricing modal (can't be closed).
 */
export function AresAppShellClient(props: {
  businessId: string;
  businessName: string;
  businessType: string;
  ownerName: string;
  needsOnboarding: boolean;
  locked?: boolean;
}) {
  const [needsOnboard, setNeedsOnboard] = useState(props.needsOnboarding);

  const handleOnboarded = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    if (!needsOnboard) return;
  }, [needsOnboard]);

  return (
    <AresAppShell
      businessId={props.businessId}
      businessName={props.businessName}
      businessType={props.businessType}
      ownerName={props.ownerName}
      needsOnboarding={needsOnboard}
      onOnboarded={handleOnboarded}
      locked={props.locked ?? false}
    />
  );
}
