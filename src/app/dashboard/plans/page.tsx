import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PlansGrid } from "@/components/dashboard/plans-grid";

export default async function PlansPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
        <p className="text-gray-500 mt-1">Choose the plan that works best for you</p>
      </div>
      <PlansGrid
        plans={serializedPlans}
        activePlanId={activeMembership?.planId ?? null}
      />
    </div>
  );
}
