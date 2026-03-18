import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BillingCard } from "@/components/admin/billing-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const club = await prisma.club.findUnique({
    where: { adminId: session.user.id },
    select: {
      subscriptionStatus: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      stripeSubscriptionId: true,
    },
  });

  if (!club) redirect("/onboarding");

  const { success, canceled } = await searchParams;
  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-500 mt-1">Manage your Clubsy subscription</p>
      </div>

      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">Payment successful! Your subscription is now active.</p>
        </div>
      )}

      {canceled && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">Checkout canceled. You can try again when you&apos;re ready.</p>
        </div>
      )}

      {/* Trial info */}
      {club.subscriptionStatus === "TRIAL" && (
        <Card>
          <CardContent className="py-4 flex items-center gap-3">
            <Badge variant="warning">Free Trial</Badge>
            <p className="text-sm text-gray-600">
              Trial ends: <strong>{new Date(club.trialEndsAt).toLocaleDateString()}</strong>
            </p>
          </CardContent>
        </Card>
      )}

      <BillingCard
        subscriptionStatus={club.subscriptionStatus}
        trialEndsAt={club.trialEndsAt.toISOString()}
        currentPeriodEnd={club.currentPeriodEnd}
        stripeConfigured={stripeConfigured}
      />
    </div>
  );
}
