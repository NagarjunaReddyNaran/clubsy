import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MembershipStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { formatDate, getMembershipStatusColor } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { ExportButton } from "@/components/admin/export-button";
import { Plus, CreditCard } from "lucide-react";

const PAGE_SIZE = 10;
const TABS = ["ALL", "ACTIVE", "EXPIRED", "PENDING", "CANCELLED"] as const;
const VALID_STATUSES = new Set<string>(Object.values(MembershipStatus));

export default async function AdminMembershipsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const { status, q: rawQ, page: pageStr } = await searchParams;
  const activeFilter = status && VALID_STATUSES.has(status) ? (status as MembershipStatus) : null;
  const query = rawQ?.trim() ?? "";
  const page = Math.max(1, parseInt(pageStr ?? "1"));
  const clubId = session.user.clubId;

  const where = {
    ...(activeFilter ? { status: activeFilter } : {}),
    ...(clubId ? { clubId } : {}),
    ...(query
      ? {
          user: {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { email: { contains: query, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };

  const [memberships, total] = await Promise.all([
    prisma.membership.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        plan: { select: { name: true, price: true, currency: true } },
        payments: { where: { status: "COMPLETED" }, select: { amount: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.membership.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Memberships</h1>
          <p className="text-gray-500 mt-1">
            {total} membership{total !== 1 ? "s" : ""}
            {query && ` matching "${query}"`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportButton
            endpoint="/api/admin/export/memberships"
            params={activeFilter ? { status: activeFilter } : undefined}
            label="Export CSV"
          />
          <Link href="/admin/memberships/new">
            <Button size="sm">
              <Plus className="w-4 h-4" />
              Add Membership
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter tabs + search */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 flex-wrap">
          {TABS.map((s) => {
            const isActive = s === "ALL" ? !activeFilter : activeFilter === s;
            const base = s === "ALL" ? "/admin/memberships" : `/admin/memberships?status=${s}`;
            const href = query ? `${base}${s === "ALL" ? "?" : "&"}q=${encodeURIComponent(query)}` : base;
            return (
              <Link
                key={s}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s}
              </Link>
            );
          })}
        </div>
        <Suspense fallback={<div className="h-9 bg-gray-100 rounded-lg animate-pulse w-64" />}>
          <SearchInput
            placeholder="Search by player name or email…"
            defaultValue={query}
            className="sm:max-w-xs w-full"
          />
        </Suspense>
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          {memberships.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No memberships found</p>
              {(query || activeFilter) && (
                <p className="text-sm text-gray-400 mt-1">Try a different search or status filter.</p>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      {["Player", "Plan", "Status", "Start", "End", "Paid", ""].map((h) => (
                        <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {memberships.map((m) => {
                      const totalPaid = m.payments.reduce((s, p) => s + Number(p.amount), 0);
                      return (
                        <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3.5">
                            <p className="text-sm font-medium text-gray-900">{m.user.name}</p>
                            <p className="text-xs text-gray-500">{m.user.email}</p>
                          </td>
                          <td className="px-6 py-3.5 text-sm text-gray-700">{m.plan.name}</td>
                          <td className="px-6 py-3.5">
                            <Badge variant={getMembershipStatusColor(m.status)}>{m.status}</Badge>
                          </td>
                          <td className="px-6 py-3.5 text-sm text-gray-600 whitespace-nowrap">{formatDate(m.startDate)}</td>
                          <td className="px-6 py-3.5 text-sm text-gray-600 whitespace-nowrap">{formatDate(m.endDate)}</td>
                          <td className="px-6 py-3.5 text-sm font-medium text-green-600">
                            {formatCurrency(totalPaid, (m.plan.currency as never) || "CAD")}
                          </td>
                          <td className="px-6 py-3.5">
                            <Link href={`/admin/memberships/${m.id}`}>
                              <Button variant="ghost" size="sm">View</Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
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
        {memberships.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No memberships found</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {memberships.map((m) => {
              const totalPaid = m.payments.reduce((s, p) => s + Number(p.amount), 0);
              return (
                <Card key={m.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{m.user.name}</p>
                        <p className="text-xs text-gray-500">{m.user.email}</p>
                      </div>
                      <Badge variant={getMembershipStatusColor(m.status)}>{m.status}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                      <div><span className="text-gray-400">Plan:</span> {m.plan.name}</div>
                      <div><span className="text-gray-400">Paid:</span> <span className="text-green-600 font-medium">{formatCurrency(totalPaid, (m.plan.currency as never) || "CAD")}</span></div>
                      <div><span className="text-gray-400">Start:</span> {formatDate(m.startDate)}</div>
                      <div><span className="text-gray-400">End:</span> {formatDate(m.endDate)}</div>
                    </div>
                    <Link href={`/admin/memberships/${m.id}`}>
                      <Button variant="outline" size="sm" className="w-full">View Details</Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
            <Suspense fallback={null}>
              <Pagination total={total} pageSize={PAGE_SIZE} currentPage={page} />
            </Suspense>
          </>
        )}
      </div>
    </div>
  );
}
