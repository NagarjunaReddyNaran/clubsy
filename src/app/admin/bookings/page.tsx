import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { canUseBooking } from "@/lib/features";
import { redirect as nextRedirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Users, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; slotId?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  if (!canUseBooking(session.user.subscriptionPlan)) {
    nextRedirect("/admin/slots"); // slots page shows upgrade CTA
  }

  const clubId = session.user.clubId!;
  const { date: dateParam, slotId } = await searchParams;

  const dateFilter = dateParam ? new Date(dateParam + "T00:00:00.000Z") : undefined;

  const [bookings, slots] = await Promise.all([
    prisma.booking.findMany({
      where: {
        slot: { clubId },
        ...(dateFilter ? { date: dateFilter } : {}),
        ...(slotId ? { slotId } : {}),
      },
      include: {
        user: { select: { name: true, email: true } },
        slot: { select: { name: true, startTime: true, endTime: true } },
      },
      orderBy: [{ date: "desc" }, { slot: { startTime: "asc" } }],
      take: 200,
    }),
    prisma.slot.findMany({
      where: { clubId },
      select: { id: true, name: true, startTime: true, endTime: true },
      orderBy: { startTime: "asc" },
    }),
  ]);

  const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length;
  const cancelledCount = bookings.filter((b) => b.status === "CANCELLED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500 mt-1">
            {confirmedCount} confirmed · {cancelledCount} cancelled
          </p>
        </div>
        <Link href="/admin/slots">
          <Button variant="outline" size="sm">
            Manage Slots
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <form method="GET" className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Date</label>
              <input
                name="date"
                type="date"
                defaultValue={dateParam ?? ""}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Slot</label>
              <select
                name="slotId"
                defaultValue={slotId ?? ""}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All slots</option>
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || `${s.startTime}–${s.endTime}`}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="outline" size="sm">Filter</Button>
            {(dateParam || slotId) && (
              <Link href="/admin/bookings">
                <Button variant="ghost" size="sm">Clear</Button>
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Bookings list */}
      {bookings.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No bookings found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Slot</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        Player
                      </span>
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Booked At</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatDate(b.date)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                          <span>
                            {b.slot.name
                              ? `${b.slot.name} (${b.slot.startTime}–${b.slot.endTime})`
                              : `${b.slot.startTime}–${b.slot.endTime}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{b.user.name}</p>
                          <p className="text-xs text-gray-400">{b.user.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={b.status === "CONFIRMED" ? "success" : "default"}>
                          {b.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(b.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lock icon for non-premium — should not reach here, but just in case */}
      {!canUseBooking(session.user.subscriptionPlan) && (
        <div className="flex items-center gap-2 text-sm text-gray-500 border border-dashed border-gray-200 rounded-xl p-4">
          <Lock className="w-4 h-4" />
          Booking system requires Premium plan.
        </div>
      )}
    </div>
  );
}
