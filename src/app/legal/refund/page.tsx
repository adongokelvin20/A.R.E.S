import { LegalLayout } from "@/components/ares/legal-layout";

export const dynamic = "force-dynamic";

export default function RefundPage() {
  return (
    <LegalLayout title="Refund Policy">
      <div className="space-y-6">
        <section>
          <h2 className="text-base font-semibold text-ares-navy">1. Subscription Refunds</h2>
          <p className="mt-2">You may request a full refund within 7 days of your initial subscription purchase. After the 7-day period, subscriptions are non-refundable. To request a refund, contact us at billing@kevtech.com with your account email and order number.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">2. Cancellation</h2>
          <p className="mt-2">You can cancel your subscription at any time from your account settings. Cancellation takes effect at the end of your current billing period. You will retain access to the Service until the end of the period you have paid for.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">3. Pro-Rata Refunds</h2>
          <p className="mt-2">Annual subscriptions cancelled after the 7-day refund window are eligible for a pro-rata refund of unused months, minus a 10% administrative fee, if cancelled due to service issues that we cannot resolve within 30 days of reporting.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">4. Service Interruptions</h2>
          <p className="mt-2">If the Service experiences significant downtime (more than 4 consecutive hours) due to our negligence, we will credit your account with additional service time equal to the downtime period, plus an additional 24 hours as compensation.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">5. Non-Refundable Items</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>One-time setup or onboarding fees</li>
            <li>Custom development or integration services</li>
            <li>Third-party costs passed through (e.g., WhatsApp message fees)</li>
            <li>Subscriptions cancelled after the 7-day refund window (except as noted above)</li>
          </ul>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">6. How Refunds Are Processed</h2>
          <p className="mt-2">Approved refunds are processed back to the original payment method within 5-10 business days. The timing depends on your bank or payment provider.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">7. Plan Changes</h2>
          <p className="mt-2">Upgrades take effect immediately and are pro-rated. Downgrades take effect at the start of your next billing cycle. We do not issue refunds for downgrades but will credit the difference to your account.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">8. Contact</h2>
          <p className="mt-2">For refund requests or billing questions, contact us at billing@kevtech.com.</p>
        </section>
      </div>
    </LegalLayout>
  );
}
