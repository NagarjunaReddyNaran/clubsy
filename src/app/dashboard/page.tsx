import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, getDaysRemaining, getMembershipStatusColor } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import {
  CreditCard,
  Calendar,
  Package,
  Bell,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const clubId = session.user.clubId;

  const [activeMembership, announcements, notifications] = await Promise.all([
    prisma.membership.findFirst({
      where: { userId: session.user.id, status: "ACTIVE" },
      include: {
        plan: true,
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.announcement.findMany({
      where: { isActive: true, ...(clubId ? { clubId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.notification.findMany({
      where: { userId: session.user.id, isRead: false },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const daysRemaining = activeMembership
    ? getDaysRemaining(activeMembership.endDate)
    : 0;

  const planCurrency = (activeMembership?.plan.currency as never) || "CAD";

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Welcome back, {session.user.name?.split(" ")[0]}!
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Here&apos;s your membership overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-4 px-3 sm:px-4 sm:py-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Status</p>
                {activeMembership ? (
                  <Badge variant={getMembershipStatusColor(activeMembership.status)} className="mt-0.5">
                    {activeMembership.status}
                  </Badge>
                ) : (
                  <p className="text-sm font-semibold text-gray-400">None</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4 px-3 sm:px-4 sm:py-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Days Left</p>
                <p className={`text-lg font-bold ${daysRemaining <= 7 && daysRemaining > 0 ? "text-red-600" : "text-gray-900"}`}>
                  {activeMembership ? Math.max(daysRemaining, 0) : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4 px-3 sm:px-4 sm:py-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Plan</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {activeMembership?.plan.name ?? <span className="text-gray-400">None</span>}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4 px-3 sm:px-4 sm:py-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                <Bell className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Notifications</p>
                <p className="text-lg font-bold text-gray-900">{notifications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Membership card */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Active Membership</h2>
                <Link href="/dashboard/plans">
                  <Button variant="outline" size="sm">
                    {activeMembership ? "Upgrade" : "Subscribe"}
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {activeMembership ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                    <div>
                      <p className="font-semibold text-gray-900">{activeMembership.plan.name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {formatCurrency(activeMembership.plan.price, planCurrency)} /{" "}
                        {activeMembership.plan.duration} days
                      </p>
                    </div>
                    <Badge variant={getMembershipStatusColor(activeMembership.status)}>
                      {activeMembership.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Start Date</p>
                      <p className="text-sm font-medium mt-1">{formatDate(activeMembership.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">End Date</p>
                      <p className="text-sm font-medium mt-1">{formatDate(activeMembership.endDate)}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {(() => {
                    const total = activeMembership.plan.duration;
                    const used = total - Math.max(daysRemaining, 0);
                    const percent = Math.min((used / total) * 100, 100);
                    return (
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>{used} days used</span>
                          <span>{Math.max(daysRemaining, 0)} remaining</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${percent > 80 ? "bg-red-500" : "bg-blue-500"}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {daysRemaining <= 7 && daysRemaining > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>
                        Expires in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}.{" "}
                        <Link href="/dashboard/plans" className="font-medium underline">Renew now</Link>
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Link href="/dashboard/membership">
                      <Button variant="outline" size="sm">View Details</Button>
                    </Link>
                    <Link href="/dashboard/membership/extend">
                      <Button variant="ghost" size="sm">Request Extension</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No active membership</p>
                  <Link href="/dashboard/plans">
                    <Button>Browse Plans</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Announcements */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Announcements</h2>
                {notifications.length > 0 && (
                  <Link href="/dashboard/notifications">
                    <Badge variant="info">{notifications.length} new</Badge>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {announcements.length > 0 ? (
                <div className="space-y-3">
                  {announcements.map((a) => (
                    <div key={a.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-900">{a.title}</p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.content}</p>
                      <p className="text-xs text-gray-400 mt-2">{formatDate(a.createdAt)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No announcements</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
