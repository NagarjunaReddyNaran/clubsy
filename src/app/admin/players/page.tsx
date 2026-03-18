import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Pagination } from "@/components/ui/pagination";
import { DateFilter } from "@/components/ui/date-filter";
import { ClearFiltersButton } from "@/components/ui/clear-filters-button";
import { PlayerDeleteButton } from "@/components/admin/player-delete-button";
import { formatDate, getMembershipStatusColor } from "@/lib/utils";
import { ExportButton } from "@/components/admin/export-button";
import { Users, Upload, Plus, Pencil } from "lucide-react";

const PAGE_SIZE = 20;

export default async function AdminPlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const { q: rawQ, page: pageStr, from, to } = await searchParams;
  const query = rawQ?.trim() ?? "";
  const page = Math.max(1, parseInt(pageStr ?? "1"));
  const clubId = session.user.clubId;

  const dateFilter =
    from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
          },
        }
      : {};

  const where = {
    role: "USER" as const,
    ...(clubId ? { clubId } : {}),
    ...dateFilter,
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
            { phone: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [players, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          include: { plan: { select: { name: true } } },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  const hasFilters = !!(query || from || to);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Players</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {total} player{total !== 1 ? "s" : ""}
            {query && ` matching "${query}"`}
            {(from || to) && ` · joined ${from ?? ""}${from && to ? " – " : ""}${to ?? ""}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/import">
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4" />
              Import
            </Button>
          </Link>
          <ExportButton endpoint="/api/admin/export/players" label="Export CSV" />
          <Link href="/admin/players/new">
            <Button size="sm">
              <Plus className="w-4 h-4" />
              Add Player
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <Suspense fallback={<div className="h-9 bg-gray-100 rounded-lg animate-pulse w-64" />}>
          <SearchInput placeholder="Search by name, email or phone…" defaultValue={query} className="sm:max-w-xs w-full" />
        </Suspense>
        <Suspense fallback={null}>
          <DateFilter from={from} to={to} />
        </Suspense>
        {hasFilters && (
          <Suspense fallback={null}>
            <ClearFiltersButton />
          </Suspense>
        )}
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block overflow-hidden">
        <CardContent className="p-0">
          {players.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">
                {hasFilters ? "No players match the current filters" : "No players registered yet"}
              </p>
              {hasFilters ? (
                <Suspense fallback={null}>
                  <div className="mt-4 flex justify-center">
                    <ClearFiltersButton />
                  </div>
                </Suspense>
              ) : (
                <Link href="/admin/players/new">
                  <Button size="sm" className="mt-4"><Plus className="w-4 h-4" /> Add first player</Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      {["Player", "Phone", "Current Plan", "Membership", "Joined", ""].map((h) => (
                        <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {players.map((player) => {
                      const m = player.memberships[0];
                      return (
                        <tr key={player.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-blue-700 text-sm font-semibold">
                                  {player.name?.charAt(0)?.toUpperCase() || "?"}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{player.name}</p>
                                <p className="text-xs text-gray-500">{player.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-sm text-gray-600">{player.phone || "—"}</td>
                          <td className="px-6 py-3.5 text-sm text-gray-600">
                            {m?.plan.name ?? <span className="text-gray-400">No plan</span>}
                          </td>
                          <td className="px-6 py-3.5">
                            {m ? (
                              <Badge variant={getMembershipStatusColor(m.status)}>{m.status}</Badge>
                            ) : (
                              <Badge variant="default">Inactive</Badge>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                            {formatDate(player.createdAt)}
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Link
                                href={`/admin/players/${player.id}/edit`}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Edit player"
                              >
                                <Pencil className="w-4 h-4" />
                              </Link>
                              <PlayerDeleteButton id={player.id} name={player.name ?? "this player"} />
                            </div>
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
        {players.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">
                {hasFilters ? "No players match the current filters" : "No players registered yet"}
              </p>
              {hasFilters && (
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
            {players.map((player) => {
              const m = player.memberships[0];
              return (
                <Card key={player.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-700 font-semibold">
                            {player.name?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{player.name}</p>
                          <p className="text-xs text-gray-500">{player.email}</p>
                          {player.phone && <p className="text-xs text-gray-400">{player.phone}</p>}
                        </div>
                      </div>
                      {m ? (
                        <Badge variant={getMembershipStatusColor(m.status)}>{m.status}</Badge>
                      ) : (
                        <Badge variant="default">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                      <span className="text-xs text-gray-400">
                        {m ? m.plan.name : "No plan"} · {formatDate(player.createdAt)}
                      </span>
                      <div className="flex gap-1">
                        <Link
                          href={`/admin/players/${player.id}/edit`}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        <PlayerDeleteButton id={player.id} name={player.name ?? "this player"} />
                      </div>
                    </div>
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
