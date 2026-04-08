import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/navbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CurrencyProvider } from "@/context/currency-context";
import { NoClubScreen } from "@/components/layout/no-club-screen";
import type { CurrencyCode } from "@/lib/currency";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, isRead: false },
  });

  const clubName = session.user.clubName ?? null;

  // Fetch club data if the user belongs to a club
  const clubData = session.user.clubId
    ? await prisma.club.findUnique({
        where: { id: session.user.clubId },
        select: { logoUrl: true, subscriptionPlan: true },
      })
    : null;
  const clubLogoUrl = clubData?.logoUrl ?? null;
  const isPremium = clubData?.subscriptionPlan === "PREMIUM";

  return (
    <CurrencyProvider initialCurrency={(session.user.currency as CurrencyCode) ?? "CAD"}>
      <div className="min-h-screen bg-gray-50">
        <header className="fixed top-0 left-0 right-0 z-50">
          <Navbar user={session.user} unreadCount={unreadCount} clubName={clubName} clubLogoUrl={clubLogoUrl} isPremium={isPremium} />
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20 sm:pb-8">
          {session.user.clubId ? children : <NoClubScreen />}
        </main>
        <BottomNav role="USER" unreadCount={unreadCount} isPremium={isPremium} />
      </div>
    </CurrencyProvider>
  );
}
