import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Footer } from "@/components/layout/footer";
import { CheckCircle2, Users, CreditCard, BarChart3, Shield, Zap, Calendar } from "lucide-react";

const FEATURES = [
  {
    icon: Users,
    title: "Member Management",
    desc: "Add players, manage profiles, track membership status — all in one place.",
  },
  {
    icon: CreditCard,
    title: "Plans & Payments",
    desc: "Create flexible membership plans, record payments, and handle extensions.",
  },
  {
    icon: Calendar,
    title: "Session Tracking",
    desc: "Track sessions per member, enforce limits, and monitor attendance.",
  },
  {
    icon: BarChart3,
    title: "Dashboard & Reports",
    desc: "Real-time stats on active members, revenue, and expiring memberships.",
  },
  {
    icon: Shield,
    title: "Secure & Reliable",
    desc: "Role-based access, audit logs, and data stored securely in the cloud.",
  },
  {
    icon: Zap,
    title: "Quick Setup",
    desc: "Create your club, invite members, and start managing in minutes.",
  },
];

const PERKS = [
  "14-day free trial — no credit card required",
  "Unlimited membership plans",
  "CSV import & export",
  "Shareable invite links for players",
  "Mobile-friendly design",
];

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    if (session.user.role === "ADMIN") {
      const hasClub = session.user.clubId != null;
      if (!hasClub) {
        const club = await prisma.club.findUnique({ where: { adminId: session.user.id }, select: { id: true } });
        if (!club) redirect("/onboarding");
      }
      redirect("/admin");
    } else {
      redirect("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">Clubsy</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/start"
              className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-blue-50 to-white py-20 px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <Zap className="w-3.5 h-3.5" />
              Sports club management, simplified
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-5">
              Run your sports club<br className="hidden sm:block" /> like a pro.
            </h1>
            <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto">
              Manage memberships, payments, and players — all from one clean dashboard. Built for small clubs, not enterprise.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/start"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm"
              >
                Start free trial
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Sign in to your club
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-center gap-1.5 text-sm text-gray-500">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {perk}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-4 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              Everything your club needs
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              From first signup to daily operations — Clubsy covers the full lifecycle of club management.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-5 rounded-xl border border-gray-100 bg-white hover:shadow-sm transition-shadow">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4 bg-blue-600 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Ready to get started?
            </h2>
            <p className="text-blue-100 mb-7 text-sm">
              Join clubs already using Clubsy. Set up your club in under 5 minutes.
            </p>
            <Link
              href="/start"
              className="inline-flex items-center justify-center bg-white text-blue-600 font-semibold px-7 py-3 rounded-xl hover:bg-blue-50 transition-colors text-sm"
            >
              Create your club — it&apos;s free
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
