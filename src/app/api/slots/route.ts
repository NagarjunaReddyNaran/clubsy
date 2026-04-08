import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUseBooking } from "@/lib/features";

/**
 * GET /api/slots?date=YYYY-MM-DD
 *
 * Returns all active slots for the player's club on a given date,
 * annotated with booked count and whether the current user has already booked.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clubId = session.user.clubId;
  if (!clubId) return NextResponse.json({ error: "Not a club member" }, { status: 400 });

  if (!canUseBooking(session.user.subscriptionPlan)) {
    return NextResponse.json({ error: "Booking system requires PREMIUM plan" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json({ error: "date query param required (YYYY-MM-DD)" }, { status: 400 });
  }

  const date = new Date(dateParam);

  const slots = await prisma.slot.findMany({
    where: { clubId, isActive: true },
    include: {
      bookings: {
        where: { date, status: "CONFIRMED" },
        select: { userId: true },
      },
    },
    orderBy: { startTime: "asc" },
  });

  const result = slots.map((slot) => ({
    id: slot.id,
    name: slot.name,
    startTime: slot.startTime,
    endTime: slot.endTime,
    capacity: slot.capacity,
    bookedCount: slot.bookings.length,
    available: slot.capacity - slot.bookings.length,
    alreadyBooked: slot.bookings.some((b) => b.userId === session.user.id),
  }));

  return NextResponse.json(result);
}
