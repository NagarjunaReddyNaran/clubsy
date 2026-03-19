import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, getMembershipStatusColor } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { ExportButton } from "@/components/admin/export-button";
import {
  Users,
  CreditCard,
  DollarSign,
  Package,
  TrendingUp,
  AlertCircle,
  Clock,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const clubId = session.user.clubId;

  const getStats = unstable_cache(
    async () => {
      return Promise.all([
        prisma.user.count({ where: { role: "USER", deletedAt: null, ...(clubId ? { clubId } : {}) } }),
        prisma.membership.count({ where: { status: "ACTIVE", endDate: { gte: new Date() }, ...(clubId ? { clubId } : {}) } }),
        prisma.membership.count({ where: { status: "EXPIRED", ...(clubId ? { clubId } : {}) } }),
        prisma.extensionRequest.count({ where: { status: "PENDING", ...(clubId ? { membership: { clubId } } : {}) } }),
        prisma.payment.aggregate({
          where: { status: "COMPLETED", ...(clubId ? { membership: { clubId } } : {}) },
          _sum: { amount: true },
        }),
      ]);
    },
    [`admin-stats-${clubId ?? "all"}`],
    { revalidate: 60, tags: [`club-${clubId ?? "all"}`] }
  );

  const [totalUsers, activeMemberships, expiredMemberships, pendingExtensions, totalRevenue] =
    await getStats();

  const [recentPayments, expiringMemberships, planStats] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "COMPLETED", ...(clubId ? { membership: { clubId } } : {}) },
      include: {
        user: { select: { name: true, email: true } },
        membership: { include: { plan: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.membership.findMany({
      where: {
        status: "ACTIVE",
        endDate: {
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          gte: new Date(),
        },
        ...(clubId ? { clubId } : {}),
      },
      include: {
        user: { select: { name: true, email: true } },
        plan: { select: { name: true } },
      },
      orderBy: { endDate: "asc" },
      take: 5,
    }),
    prisma.plan.findMany({
      where: { isActive: true, ...(clubId ? { clubId } : {}) },
      include: {
        _count: { select: { memberships: { where: { status: "ACTIVE", endDate: { gte: new Date() } } } } },
      },
    }),
  ]);

  const stats = [
    { label: "Total Players", value: totalUsers, icon: Users, color: "blue", href: "/admin/players" },
    { label: "Active Memberships", value: activeMemberships, icon: CreditCard, color: "green", href: "/admin/memberships" },
    { label: "Total Revenue", value: formatCurrency(totalRevenue._sum.amount || 0, "CAD"), icon: DollarSign, color: "purple", href: "/admin/payments" },
    { label: "Pending Extensions", value: pendingExtensions, icon: Clock, color: "orange", href: "/admin/extensions" },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your sports club</p>
        </div>
        <ExportButton endpoint="/api/admin/export/payments" label="Export Payments" />
      </div>

      {/* Alerts */}
      {(pendingExtensions > 0 || expiringMemberships.length > 0) && (
        <div className="flex flex-wrap gap-3">
          {pendingExtensions > 0 && (
            <Link href="/admin/extensions" className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm hover:bg-yellow-100 transition-colors">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{pendingExtensions} pending extension{pendingExtensions !== 1 ? "s" : ""}</span>
            </Link>
          )}
          {expiringMemberships.length > 0 && (
            <Link href="/admin/memberships" className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm hover:bg-red-100 transition-colors">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{expiringMemberships.length} expiring soon</span>
            </Link>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="py-4 px-4 sm:py-5">
                <div className="flex items-start sm:items-center gap-3">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500 leading-tight">{label}</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Payments */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Recent Payments</h2>
                <Link href="/admin/payments" className="text-sm text-blue-600 hover:text-blue-700">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentPayments.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {recentPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between px-4 sm:px-6 py-3 gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{payment.user.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {payment.membership.plan.name} • {formatDate(payment.createdAt)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-green-600">
                          {formatCurrency(payment.amount, payment.currency as never || "CAD")}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">{payment.method || "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No payments yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Plan Performance */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-gray-900">Plan Performance</h2>
            </CardHeader>
            <CardContent>
              {planStats.length > 0 ? (
                <div className="space-y-3">
                  {planStats.map((plan) => (
                    <div key={plan.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{plan.name}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(plan.price, plan.currency as never || "CAD")}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-gray-900">{plan._count.memberships}</p>
                        <p className="text-xs text-gray-500">active</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No plans yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expiring soon */}
          {expiringMemberships.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-base font-semibold text-gray-900">Expiring Soon</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {expiringMemberships.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{m.user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{m.plan.name}</p>
                      </div>
                      <Badge variant="warning" className="flex-shrink-0 text-xs">{formatDate(m.endDate)}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Summary stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: TrendingUp, color: "text-green-500", value: activeMemberships, label: "Active" },
          { icon: CreditCard, color: "text-red-400", value: expiredMemberships, label: "Expired" },
          { icon: Users, color: "text-blue-500", value: totalUsers, label: "Players" },
          { icon: Package, color: "text-purple-500", value: planStats.length, label: "Plans" },
        ].map(({ icon: Icon, color, value, label }) => (
          <Card key={label}>
            <CardContent className="py-4 text-center">
              <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
