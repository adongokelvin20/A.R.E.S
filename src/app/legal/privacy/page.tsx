import { LegalLayout } from "@/components/ares/legal-layout";

export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <div className="space-y-6">
        <section>
          <h2 className="text-base font-semibold text-ares-navy">1. Information We Collect</h2>
          <p className="mt-2">We collect information you provide directly when creating an account, including your name, email address, business name, and business type. We also collect data generated through your use of the Service, including product catalogs, customer conversations, orders, and usage analytics.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">2. How We Use Your Information</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>To provide and maintain the Service</li>
            <li>To process transactions and manage subscriptions</li>
            <li>To improve service accuracy and service quality</li>
            <li>To send important account and security notifications</li>
            <li>To provide customer support</li>
            <li>To detect and prevent fraud or abuse</li>
          </ul>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">3. Data Isolation</h2>
          <p className="mt-2">Each business on the platform has its own isolated data environment. Your business data, customer information, and conversations are never shared with or accessible by other businesses using the Service.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">4. Data Storage and Security</h2>
          <p className="mt-2">Your data is stored on secure servers with industry-standard encryption. We use SSL/TLS for data in transit and encrypt sensitive data at rest. Access to your data is restricted to authorized personnel who require it for service maintenance.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">5. Third-Party Services</h2>
          <p className="mt-2">We integrate with third-party services such as WhatsApp (Meta), payment providers, and AI model providers. These services have their own privacy policies. We only share the minimum data necessary to provide the integrated functionality.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">6. AI Processing</h2>
          <p className="mt-2">When you use AI features, your business data (products, knowledge base, conversation context) is sent to our AI model provider to generate responses. This data is processed to generate the response and is not stored by the AI provider beyond the processing period.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">7. Your Rights</h2>
          <p className="mt-2">You have the right to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your account and associated data</li>
            <li>Export your data in a machine-readable format</li>
            <li>Opt out of marketing communications</li>
          </ul>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">8. Data Retention</h2>
          <p className="mt-2">We retain your data for as long as your account is active. After account deletion, we remove your data within 30 days, except where retention is required by law for financial or legal records.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">9. Cookies</h2>
          <p className="mt-2">We use essential cookies to maintain your session and provide the Service. See our Cookie Policy for details.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">10. Children's Privacy</h2>
          <p className="mt-2">The Service is not directed to children under 16. We do not knowingly collect data from children. If you believe a child has provided us with information, please contact us for deletion.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">11. Changes to This Policy</h2>
          <p className="mt-2">We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification.</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-ares-navy">12. Contact</h2>
          <p className="mt-2">For privacy questions or requests, contact us at privacy@kevtech.com.</p>
        </section>
      </div>
    </LegalLayout>
  );
}
