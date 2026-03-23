import Link from "next/link";
import { Footer } from "@/components/layout/footer";
import { Zap } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — Clubsy",
};

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-400 mb-8">Last updated: March 2026</p>

          <div className="space-y-8 text-sm text-gray-600 leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">1. What We Collect</h2>
              <p>When you use Clubsy, we collect information you provide directly:</p>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li><strong>Account data:</strong> name, email address, phone number, and password (stored as a bcrypt hash).</li>
                <li><strong>Club data:</strong> club name, logo, membership plans, and member records you create.</li>
                <li><strong>Payment data:</strong> payment amounts and methods you record. Card details are handled entirely by Stripe — we never see or store raw card numbers.</li>
                <li><strong>Usage data:</strong> audit logs of admin actions within your club.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">2. How We Use It</h2>
              <ul className="list-disc ml-5 space-y-1">
                <li>To provide and operate the Clubsy platform.</li>
                <li>To send transactional emails (membership confirmations, expiry reminders).</li>
                <li>To process your subscription billing via Stripe.</li>
                <li>To respond to support requests.</li>
                <li>To improve reliability and diagnose issues.</li>
              </ul>
              <p className="mt-3">We do <strong>not</strong> sell your data or use it for advertising.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Data Storage</h2>
              <p>Your data is stored in a PostgreSQL database hosted on Neon (a managed cloud database provider). Data is encrypted in transit (TLS) and at rest. Backups are retained for disaster recovery.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Third-Party Services</h2>
              <p>We use the following third-party services:</p>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li><strong>Stripe</strong> — payment processing and subscription billing.</li>
                <li><strong>Vercel</strong> — application hosting.</li>
                <li><strong>Inngest</strong> — background job processing.</li>
                <li><strong>Sentry</strong> — error monitoring (no personally identifiable data in error payloads).</li>
              </ul>
              <p className="mt-3">Each service has its own privacy policy and data processing terms.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Your Rights</h2>
              <p>You may request to:</p>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Access a copy of your data.</li>
                <li>Correct inaccurate information.</li>
                <li>Delete your account and associated data.</li>
              </ul>
              <p className="mt-3">
                To exercise these rights,{" "}
                <Link href="/contact" className="text-blue-600 hover:underline">contact us</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Cookies</h2>
              <p>
                Clubsy uses session cookies for authentication only. We do not use tracking cookies or third-party analytics cookies.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Changes to This Policy</h2>
              <p>
                We may update this policy from time to time. Material changes will be communicated via email or in-app notification.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Contact</h2>
              <p>
                Questions?{" "}
                <Link href="/contact" className="text-blue-600 hover:underline">Reach out to us</Link>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
