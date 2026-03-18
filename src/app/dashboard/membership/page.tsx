import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatDate,
  getDaysRemaining,
  getMembershipStatusColor,
} from "@/lib/utils";
import { formatCurrency, type CurrencyCode } from "@/lib/currency";
import { Package, Clock, CheckCircle2, AlertCircle } from "lucide-react";

export default async function MembershipPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: {
      plan: true,
      payments: { orderBy: { createdAt: "desc" } },
      extensionRequests: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    orderBy: { createdAt: "desc" },
  });

  const activeMembership = memberships.find((m) => m.status === "ACTIVE");
  const history = memberships.filter((m) => m.status !== "ACTIVE");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Membership</h1>
        <p className="text-gray-500 mt-1">View and manage your membership details</p>
      </div>

      {/* Active Membership */}
      {activeMembership ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Active Membership</h2>
              <Badge variant={getMembershipStatusColor(activeMembership.status)}>
                {activeMembership.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{activeMembership.plan.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {formatCurrency(activeMembership.plan.price, activeMembership.plan.currency as CurrencyCode)} / {activeMembership.plan.duration} days
                  </p>
                </div>
                <Package className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Start Date</p>
                <p className="text-sm font-medium mt-1">{formatDate(activeMembership.startDate)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">End Date</p>
                <p className="text-sm font-medium mt-1">{formatDate(activeMembership.endDate)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Days Left</p>
                <p className={`text-sm font-medium mt-1 ${
                  getDaysRemaining(activeMembership.endDate) <= 7 ? "text-red-600" : ""
                }`}>
                  {Math.max(getDaysRemaining(activeMembership.endDate), 0)}
                </p>
              </div>
              {activeMembership.plan.maxSessions && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Sessions Used</p>
                  <p className="text-sm font-medium mt-1">
                    {activeMembership.sessions} / {activeMembership.plan.maxSessions}
                  </p>
                </div>
              )}
            </div>

            {/* Features */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Plan Features</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {activeMembership.plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Status */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Payment Status</p>
              {activeMembership.payments.length > 0 ? (
                <div className="space-y-2">
                  {activeMembership.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {payment.status === "COMPLETED" ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                        )}
                        <span>{formatCurrency(payment.amount, payment.currency as CurrencyCode)}</span>
                        {payment.method && (
                          <span className="text-gray-400 capitalize">via {payment.method}</span>
                        )}
                      </div>
                      <Badge
                        variant={payment.status === "COMPLETED" ? "success" : "warning"}
                      >
                        {payment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No payment records</p>
              )}
            </div>

            {/* Extension Requests */}
            {activeMembership.extensionRequests.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Extension Requests</p>
                <div className="space-y-2">
                  {activeMembership.extensionRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{req.days} day extension requested</span>
                        <span className="text-gray-400">({formatDate(req.createdAt)})</span>
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
              </div>
            )}

            {getDaysRemaining(activeMembership.endDate) <= 7 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Your membership expires soon!
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Link href="/dashboard/membership/extend">
                <Button variant="outline" size="sm">
                  <Clock className="w-4 h-4" />
                  Request Extension
                </Button>
              </Link>
              <Link href="/dashboard/plans">
                <Button variant="ghost" size="sm">Upgrade Plan</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Active Membership
            </h3>
            <p className="text-gray-500 mb-6">
              Subscribe to a plan to start using the club facilities.
            </p>
            <Link href="/dashboard/plans">
              <Button size="lg">Browse Plans</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-gray-900">Membership History</h2>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {history.map((m) => (
                <div key={m.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.plan.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(m.startDate)} – {formatDate(m.endDate)}
                    </p>
                  </div>
                  <Badge variant={getMembershipStatusColor(m.status)}>{m.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
