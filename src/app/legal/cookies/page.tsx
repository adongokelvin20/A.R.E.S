import { LegalLayout } from "@/components/ares/legal-layout";

export const dynamic = "force-dynamic";

export default function CookiesPage() {
  return (
    <LegalLayout title="Cookie Policy">
      <div className="space-y-6">
        <section>
          <h2 className="text-base font-semibold text-ares-navy">1. What Are Cookies</h2>
          <p className="mt-2">Cookies are small text files stored on your device when you visit a website. They help us maintain your session, remember your preferences, and understand how you use the Service.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">2. Cookies We Use</h2>
          <p className="mt-2">We use the following types of cookies:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Essential cookies:</strong> Required for the Service to function. These include session authentication and security tokens. Without these, you cannot log in or use the Service.</li>
            <li><strong>Preference cookies:</strong> Remember your settings, such as theme preference and language selection.</li>
            <li><strong>Analytics cookies:</strong> Help us understand how the Service is used so we can improve it. These are anonymous and aggregated.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">3. Third-Party Cookies</h2>
          <p className="mt-2">Some features of the Service may use third-party cookies, such as those from payment providers or analytics services. These third parties have their own cookie policies and controls.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">4. Managing Cookies</h2>
          <p className="mt-2">You can control and delete cookies through your browser settings. Note that disabling essential cookies will prevent you from logging in and using the Service. Disabling non-essential cookies will not affect core functionality.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">5. Cookie Duration</h2>
          <p className="mt-2">Session cookies are deleted when you close your browser. Persistent cookies remain on your device for up to 12 months unless you delete them earlier.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">6. Changes to This Policy</h2>
          <p className="mt-2">We may update this Cookie Policy as we introduce new features or change how cookies are used. We will notify you of significant changes.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">7. Contact</h2>
          <p className="mt-2">For questions about our use of cookies, contact us at privacy@kevtech.com.</p>
        </section>
      </div>
    </LegalLayout>
  );
}
