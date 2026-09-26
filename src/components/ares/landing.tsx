"use client";

import { AresNavbar } from "./navbar";
import { AresHero } from "./hero";
import { AresPlatform } from "./platform";
import { AresHowItWorks } from "./how-it-works";
import { AresBusinessTypes } from "./business-types";
import { AresPricing } from "./pricing";
import { AresFooter } from "./footer";

export function AresLanding() {
  return (
    <main className="min-h-screen bg-white">
      <AresNavbar />
      <AresHero />
      <AresPlatform />
      <AresHowItWorks />
      <AresBusinessTypes />
      <AresPricing />
      <AresFooter />
    </main>
  );
}
