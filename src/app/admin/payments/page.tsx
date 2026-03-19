import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { Pagination } from "@/components/ui/pagination";
import { DateFilter } from "@/components/ui/date-filter";
import { ClearFiltersButton } from "@/components/ui/clear-filters-button";
import { formatDate } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { ExportButton } from "@/components/admin/export-button";
import { DollarSign, FileText } from "lucide-react";

const PAGE_SIZE = 10;

const statusColor: Record<string, "success" | "warning" | "danger" | "default"> = {
  COMPLETED: "success",
  PENDING: "warning",
  FAILED: "danger",
  REFUNDED: "default",
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; q?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const { from, to, q: rawQ, page: pageStr } = await searchParams;
  const query = rawQ?.trim() ?? "";
  const page = Math.max(1, parseInt(pageStr ?? "1"));
  const clubId = session.user.clubId;

  const dateFilter =
    from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to + "T23:59:59") } : {}),
          },
        }
      : {};

  const searchFilter = query
    ? {
        user: {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
          ],
        },
      }
    : {};

  const clubFilter = clubId ? { membership: { clubId } } : {};
  const where = { ...dateFilter, ...searchFilter, ...clubFilter };

  const [payments, total, totalRevenue, monthRevenue] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        membership: { include: { plan: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({
      where: { status: "COMPLETED", ...(clubId ? { membership: { clubId } } : {}) },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        status: "COMPLETED",
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        ...(clubId ? { membership: { clubId } } : {}),
      },
      _sum: { amount: true },
    }),
  ]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {total} transaction{total !== 1 ? "s" : ""}
            {query && ` for "${query}"`}
          </p>
        </div>
        <ExportButton
          endpoint="/api/admin/export/payments"
          params={{ ...(from ? { from } : {}), ...(to ? { to } : {}) }}
          label="Export CSV"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Revenue", value: formatCurrency(totalRevenue._sum.amount || 0, "CAD"), color: "green" },
          { label: "This Month", value: formatCurrency(monthRevenue._sum.amount || 0, "CAD"), color: "blue" },
          { label: "Completed", value: payments.filter((p) => p.status === "COMPLETED").length, color: "purple" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="py-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-${color}-50 flex items-center justify-center flex-shrink-0`}>
                  <DollarSign className={`w-5 h-5 text-${color}-600`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                  <p className="text-xl font-bold text-gray-900">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Suspense fallback={<div className="h-9 bg-gray-100 rounded-lg animate-pulse w-64" />}>
            <SearchInput placeholder="Search by player name or email…" defaultValue={query} className="sm:max-w-xs w-full" />
          </Suspense>
          {(query || from || to) && (
            <Suspense fallback={null}>
              <ClearFiltersButton />
            </Suspense>
          )}
        </div>
        <Suspense fallback={<div className="h-9 bg-gray-100 rounded-lg animate-pulse" />}>
          <DateFilter from={from} to={to} />
        </Suspense>
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block overflow-hidden">
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900">Transactions</h2>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No payments found</p>
              {(query || from || to) && (
                <div className="mt-4 flex justify-center">
                  <Suspense fallback={null}>
                    <ClearFiltersButton />
                  </Suspense>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      {["Player", "Plan", "Amount", "Method", "Status", "Date", "Reference"].map((h) => (
                        <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3.5">
                          <p className="text-sm font-medium text-gray-900">{p.user.name}</p>
                          <p className="text-xs text-gray-500">{p.user.email}</p>
                        </td>
                        <td className="px-6 py-3.5 text-sm text-gray-700">{p.membership.plan.name}</td>
                        <td className="px-6 py-3.5 text-sm font-semibold text-gray-900">
                          {formatCurrency(p.amount, (p.currency as never) || "CAD")}
                        </td>
                        <td className="px-6 py-3.5 text-sm text-gray-600 capitalize">{p.method || "—"}</td>
                        <td className="px-6 py-3.5">
                          <Badge variant={statusColor[p.status] || "default"}>{p.status}</Badge>
                        </td>
                        <td className="px-6 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                          {formatDate(p.createdAt)}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-gray-400 font-mono">{p.reference || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Suspense fallback={null}>
                <Pagination total={total} pageSize={PAGE_SIZE} currentPage={page} />
              </Suspense>
            </>
          )}
        </CardContent>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {payments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No payments found</p>
              {(query || from || to) && (
                <Suspense fallback={null}>
                  <div className="flex justify-center">
                    <ClearFiltersButton />
                  </div>
                </Suspense>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {payments.map((p) => (
              <Card key={p.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{p.user.name}</p>
                      <p className="text-xs text-gray-500">{p.membership.plan.name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-green-600">
                        {formatCurrency(p.amount, (p.currency as never) || "CAD")}
                      </p>
                      <Badge variant={statusColor[p.status] || "default"} className="text-xs">
                        {p.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="capitalize">{p.method || "—"}</span>
                    <span>{formatDate(p.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Suspense fallback={null}>
              <Pagination total={total} pageSize={PAGE_SIZE} currentPage={page} />
            </Suspense>
          </>
        )}
      </div>
    </div>
  );
}
