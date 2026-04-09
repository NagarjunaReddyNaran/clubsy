import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canUseBooking } from "@/lib/features";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, Lock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CancelBookingButton } from "@/components/dashboard/cancel-booking-button";
import Link from "next/link";

export default async function MyBookingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!canUseBooking(session.user.subscriptionPlan)) {
    return (
      <div className="max-w-sm mx-auto mt-16 text-center space-y-4">
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7 text-gray-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Bookings Unavailable</h1>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-gray-500">
              Slot booking is not enabled for your club.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const bookings = await prisma.booking.findMany({
    where: { userId: session.user.id },
    include: {
      slot: { select: { name: true, startTime: true, endTime: true } },
    },
    orderBy: [{ date: "asc" }, { slot: { startTime: "asc" } }],
  });

  const upcoming = bookings.filter(
    (b) => b.status === "CONFIRMED" && b.date >= today
  );
  const past = bookings.filter(
    (b) => b.status !== "CONFIRMED" || b.date < today
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-500 mt-1">
            {upcoming.length} upcoming booking{upcoming.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/dashboard/book">
          <Button size="sm">
            <CalendarDays className="w-4 h-4" />
            Book a Slot
          </Button>
        </Link>
      </div>

      {/* Upcoming */}
      {upcoming.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No upcoming bookings</p>
            <Link href="/dashboard/book">
              <Button>Book a Slot</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {upcoming.map((b) => (
            <Card key={b.id}>
              <CardContent className="py-4 px-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  {b.slot.name && (
                    <p className="font-medium text-gray-900">{b.slot.name}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-0.5">
                    <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                    <span>{formatDate(b.date)}</span>
                    <span className="text-gray-300">·</span>
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-mono">{b.slot.startTime}–{b.slot.endTime}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="success">Confirmed</Badge>
                  <CancelBookingButton bookingId={b.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Past / cancelled */}
      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
            Past &amp; Cancelled
          </h2>
          <div className="space-y-2">
            {past.map((b) => (
              <Card key={b.id} className="opacity-70">
                <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                    <CalendarDays className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{formatDate(b.date)}</span>
                    <span className="text-gray-300">·</span>
                    <span className="font-mono">{b.slot.startTime}–{b.slot.endTime}</span>
                  </div>
                  <Badge variant={b.status === "CANCELLED" ? "danger" : "default"}>
                    {b.status === "CANCELLED" ? "Cancelled" : "Completed"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
