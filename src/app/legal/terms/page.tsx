import { LegalLayout } from "@/components/ares/legal-layout";

export const dynamic = "force-dynamic";

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <div className="space-y-6">
        <section>
          <h2 className="text-base font-semibold text-ares-navy">1. Acceptance of Terms</h2>
          <p className="mt-2">By signing up for or using Kevtech (the "Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">2. Description of Service</h2>
          <p className="mt-2">Kevtech provides an AI-powered business management platform that includes customer communication tools, order management, inventory tracking, and automation features. The Service is provided on a subscription basis.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">3. Your Account</h2>
          <p className="mt-2">You are responsible for maintaining the security of your account and password. You must provide accurate and complete information when creating your account. You are solely responsible for all activities that occur under your account.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">4. Acceptable Use</h2>
          <p className="mt-2">You agree not to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Use the Service for any unlawful purpose</li>
            <li>Upload or transmit viruses, malware, or harmful code</li>
            <li>Attempt to access another user's data without authorization</li>
            <li>Use the Service to send spam or unsolicited messages</li>
            <li>Reverse engineer or modify the Service</li>
            <li>Resell or sublicense the Service without written permission</li>
          </ul>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">5. Your Data</h2>
          <p className="mt-2">You retain ownership of all data you upload to the Service, including product information, customer data, and business records. We do not sell your data to third parties. Your data is stored securely and is isolated from other businesses using the platform.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">6. AI-Generated Content</h2>
          <p className="mt-2">The Service uses artificial intelligence to assist with customer communications and business operations. While we strive for accuracy, AI-generated responses may occasionally contain errors. You are responsible for reviewing AI-generated content before it reaches your customers.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">7. Subscriptions and Billing</h2>
          <p className="mt-2">Paid subscriptions are billed on a recurring basis. You can cancel your subscription at any time. Refunds are subject to our Refund Policy. We reserve the right to change our pricing with reasonable notice.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">8. Service Availability</h2>
          <p className="mt-2">We strive to maintain 99.9% uptime but do not guarantee uninterrupted service. We are not liable for downtime caused by factors beyond our control, including network outages, maintenance, or third-party service failures.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">9. Limitation of Liability</h2>
          <p className="mt-2">The Service is provided "as is" without warranties of any kind. We are not liable for indirect, incidental, or consequential damages arising from your use of the Service. Our total liability shall not exceed the amount you paid in the preceding 12 months.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">10. Termination</h2>
          <p className="mt-2">You may terminate your account at any time. We reserve the right to suspend or terminate accounts that violate these Terms. Upon termination, your data will be deleted within 30 days unless otherwise required by law.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">11. Changes to Terms</h2>
          <p className="mt-2">We may update these Terms from time to time. We will notify you of significant changes via email or in-app notification. Continued use of the Service after changes constitutes acceptance of the new Terms.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">12. Contact</h2>
          <p className="mt-2">For questions about these Terms, contact us at legal@kevtech.com.</p>
        </section>
      </div>
    </LegalLayout>
  );
}
