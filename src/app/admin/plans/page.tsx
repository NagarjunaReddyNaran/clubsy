import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, type CurrencyCode } from "@/lib/currency";
import { Plus, Edit, Package, Users } from "lucide-react";

export default async function AdminPlansPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const clubId = session.user.clubId;
  const plans = await prisma.plan.findMany({
    where: clubId ? { clubId } : {},
    include: {
      _count: {
        select: {
          memberships: { where: { status: "ACTIVE" } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="text-gray-500 mt-1">Manage membership plans for your club</p>
        </div>
        <Link href="/admin/plans/new">
          <Button>
            <Plus className="w-4 h-4" />
            New Plan
          </Button>
        </Link>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No plans created yet</p>
            <Link href="/admin/plans/new">
              <Button>Create First Plan</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Card key={plan.id} className={!plan.isActive ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                  </div>
                  <Badge variant={plan.isActive ? "success" : "default"}>
                    {plan.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-900">
                      {formatCurrency(plan.price, plan.currency as CurrencyCode)}
                    </span>
                    <span className="text-gray-500 text-sm">/ {plan.duration} days</span>
                  </div>

                  {plan.maxSessions && (
                    <p className="text-sm text-gray-600">
                      Max sessions: <strong>{plan.maxSessions}</strong>
                    </p>
                  )}

                  <div className="space-y-1">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 flex items-center justify-between border-t border-gray-100">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Users className="w-4 h-4" />
                      <span>{plan._count.memberships} active</span>
                    </div>
                    <Link href={`/admin/plans/${plan.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="w-3 h-3" />
                        Edit
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
