import Link from "next/link";
import { Footer } from "@/components/layout/footer";
import { Zap } from "lucide-react";

export const metadata = {
  title: "Disclaimer — Clubsy",
};

export default function DisclaimerPage() {
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
        <div className="max-w-2xl mx-auto prose prose-gray">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Disclaimer</h1>
          <p className="text-sm text-gray-400 mb-8">Last updated: March 2026</p>

          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">General</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Clubsy is a software-as-a-service platform designed to assist sports clubs and organizations with membership management, payment recording, and administrative operations. The information and tools provided through Clubsy are for management purposes only and do not constitute legal, financial, or professional advice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">No Liability for Disputes</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Clubsy acts solely as a management tool. We are not a party to any agreement between a club and its members. Any disputes arising between clubs and their members — including but not limited to membership fees, refunds, access, or services — are strictly between the relevant parties. Clubsy bears no responsibility or liability for such disputes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Payment Processing</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Clubsy facilitates recording of payments and integrates with third-party payment processors (including Stripe). Clubsy is not responsible for payment failures, chargebacks, or disputes with payment processors. All financial transactions are subject to the terms of the respective payment processor.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Service Availability</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              While we strive to maintain high availability, Clubsy does not guarantee uninterrupted or error-free service. We are not liable for any loss of data or business resulting from service downtime, errors, or technical failures.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Third-Party Links</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Clubsy may contain links to third-party websites or services. We are not responsible for the content, privacy practices, or terms of those external sites.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Contact</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              If you have questions about this disclaimer, please{" "}
              <Link href="/contact" className="text-blue-600 hover:underline">contact us</Link>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
