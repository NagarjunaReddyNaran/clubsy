import Link from "next/link";
import { Footer } from "@/components/layout/footer";
import { Zap } from "lucide-react";

export const metadata = {
  title: "Terms of Service — Clubsy",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">Clubsy</span>
          </Link>
          <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-400 mb-8">Last updated: March 2026</p>

          <div className="space-y-8 text-sm text-gray-600 leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Acceptance</h2>
              <p>
                By creating an account or using Clubsy, you agree to these Terms of Service. If you do not agree, do not use the platform. These terms apply to all users, including club administrators and members.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Use of the Platform</h2>
              <p>You may use Clubsy to:</p>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Manage sports club memberships, plans, and payments.</li>
                <li>Invite members and track their activity.</li>
                <li>Record and export operational data.</li>
              </ul>
              <p className="mt-3">You may <strong>not</strong> use Clubsy to:</p>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Violate any applicable law or regulation.</li>
                <li>Upload malicious code or attempt to hack the platform.</li>
                <li>Impersonate others or provide false information.</li>
                <li>Use the platform for purposes other than club management.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Accounts</h2>
              <p>
                You are responsible for maintaining the security of your account credentials. Notify us immediately at{" "}
                <Link href="/contact" className="text-blue-600 hover:underline">contact</Link> if you suspect unauthorized access.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Subscription & Billing</h2>
              <p>
                Club administrators are billed on a monthly subscription basis. Billing is handled by Stripe. By subscribing, you authorize Stripe to charge your payment method on a recurring basis.
              </p>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li><strong>Free trial:</strong> New accounts receive a 14-day free trial. No credit card is required to start.</li>
                <li><strong>Cancellation:</strong> You may cancel your subscription at any time through the billing portal. Your access continues until the end of the current billing period.</li>
                <li><strong>Refunds:</strong> Refunds are evaluated on a case-by-case basis. Contact us within 7 days of a charge for consideration.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Data & Content</h2>
              <p>
                You retain ownership of all data you input into Clubsy (member records, payment data, announcements, etc.). By using the platform, you grant us a limited licence to store and process that data solely to provide the service.
              </p>
              <p className="mt-3">
                You are responsible for ensuring you have the right to upload any data or content and that doing so complies with applicable privacy laws (e.g., obtaining consent from your members to store their personal information).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Service Availability</h2>
              <p>
                We aim for high availability but do not guarantee uninterrupted service. Scheduled or unscheduled maintenance may occur. We are not liable for losses resulting from service interruptions.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Termination</h2>
              <p>
                We reserve the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or misuse the platform. You may delete your account at any time by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, Clubsy is not liable for indirect, incidental, or consequential damages arising from your use of the platform. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Changes to Terms</h2>
              <p>
                We may update these terms periodically. Continued use of the platform after changes constitutes acceptance of the updated terms. We will notify users of material changes via email.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Contact</h2>
              <p>
                Questions about these terms?{" "}
                <Link href="/contact" className="text-blue-600 hover:underline">Contact us</Link>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
