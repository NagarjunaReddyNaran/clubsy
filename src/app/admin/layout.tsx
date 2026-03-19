import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/navbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CurrencyProvider } from "@/context/currency-context";
import { SubscriptionBanner } from "@/components/layout/subscription-banner";
import { getDaysUntilTrialEnd } from "@/lib/subscription";
import type { CurrencyCode } from "@/lib/currency";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  // If admin has no club, send to onboarding
  const club = await prisma.club.findUnique({
    where: { adminId: session.user.id },
    select: { id: true, name: true, logoUrl: true, subscriptionStatus: true, trialEndsAt: true },
  });

  const daysLeft = club ? getDaysUntilTrialEnd(club.trialEndsAt) : 0;
  const showBanner = !!club && (
    club.subscriptionStatus === "EXPIRED" ||
    club.subscriptionStatus === "CANCELLED" ||
    (club.subscriptionStatus === "TRIAL" && daysLeft <= 3)
  );

  return (
    <CurrencyProvider initialCurrency={(session.user.currency as CurrencyCode) ?? "CAD"}>
      <div className="min-h-screen bg-gray-50">
        <header className="fixed top-0 left-0 right-0 z-50">
          {showBanner && (
            <SubscriptionBanner
              subscriptionStatus={club!.subscriptionStatus}
              trialEndsAt={club!.trialEndsAt?.toISOString() ?? null}
            />
          )}
          <Navbar
            user={session.user}
            clubName={club?.name ?? null}
            clubLogoUrl={club?.logoUrl ?? null}
          />
        </header>
        <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 sm:pb-8 ${showBanner ? "pt-28" : "pt-20"}`}>
          {!club ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center space-y-4">
                <p className="text-gray-600 font-medium">Complete your setup to access the dashboard.</p>
                <a href="/onboarding" className="inline-block px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
                  Set up your club
                </a>
              </div>
            </div>
          ) : children}
        </main>
        <BottomNav role="ADMIN" />
      </div>
    </CurrencyProvider>
  );
}
