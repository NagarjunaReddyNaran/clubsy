import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, getMembershipStatusColor } from "@/lib/utils";
import { formatCurrency, type CurrencyCode } from "@/lib/currency";
import { MembershipStatusActions } from "@/components/admin/membership-status-actions";

export default async function MembershipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const membership = await prisma.membership.findUnique({
    where: { id },
    include: {
      user: true,
      plan: true,
      payments: { orderBy: { createdAt: "desc" } },
      extensionRequests: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!membership) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Membership Details</h1>
        <p className="text-gray-500 mt-1">{membership.user.name}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Overview</h2>
            <Badge variant={getMembershipStatusColor(membership.status)}>
              {membership.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">Player</p>
              <p className="text-sm font-medium">{membership.user.name}</p>
              <p className="text-xs text-gray-500">{membership.user.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Plan</p>
              <p className="text-sm font-medium">{membership.plan.name}</p>
              <p className="text-xs text-gray-500">{formatCurrency(membership.plan.price, membership.plan.currency as CurrencyCode)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Start Date</p>
              <p className="text-sm font-medium">{formatDate(membership.startDate)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">End Date</p>
              <p className="text-sm font-medium">{formatDate(membership.endDate)}</p>
            </div>
          </div>

          <MembershipStatusActions
            membershipId={membership.id}
            currentStatus={membership.status}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900">Payments</h2>
        </CardHeader>
        <CardContent className="p-0">
          {membership.payments.length === 0 ? (
            <p className="px-6 py-4 text-sm text-gray-500">No payments</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {membership.payments.map((p) => (
                <div key={p.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{formatCurrency(p.amount, p.currency as CurrencyCode)}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {p.method || "unknown"} • {formatDate(p.createdAt)}
                    </p>
                  </div>
                  <Badge variant={p.status === "COMPLETED" ? "success" : "warning"}>
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {membership.extensionRequests.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-gray-900">Extension Requests</h2>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {membership.extensionRequests.map((req) => (
                <div key={req.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{req.days} days</p>
                    <p className="text-xs text-gray-500">{formatDate(req.createdAt)}</p>
                    {req.reason && (
                      <p className="text-xs text-gray-400 italic">{req.reason}</p>
                    )}
                  </div>
                  <Badge
                    variant={
                      req.status === "APPROVED"
                        ? "success"
                        : req.status === "REJECTED"
                        ? "danger"
                        : "warning"
                    }
                  >
                    {req.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
