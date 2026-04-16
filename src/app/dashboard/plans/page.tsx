import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PlansGrid } from "@/components/dashboard/plans-grid";
import { CheckCircle, XCircle } from "lucide-react";

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { payment } = await searchParams;
  const clubId = session.user.clubId;

  const [plans, activeMembership] = await Promise.all([
    prisma.plan.findMany({
      where: { isActive: true, ...(clubId ? { clubId } : {}) },
      orderBy: { price: "asc" },
    }),
    prisma.membership.findFirst({
      where: { userId: session.user.id, status: "ACTIVE" },
      select: { planId: true },
    }),
  ]);

  const serializedPlans = plans.map((p) => ({
    ...p,
    price: Number(p.price),
  }));

  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
        <p className="text-gray-500 mt-1">Choose the plan that works best for you</p>
      </div>

      {payment === "success" && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Payment successful!</p>
              <p className="text-xs text-green-700">Your membership has been activated. Check your email for confirmation.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {payment === "canceled" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Payment cancelled</p>
              <p className="text-xs text-amber-700">No charge was made. You can try again whenever you&apos;re ready.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <PlansGrid
        plans={serializedPlans}
        activePlanId={activeMembership?.planId ?? null}
        stripeConfigured={stripeConfigured}
      />
    </div>
  );
}
