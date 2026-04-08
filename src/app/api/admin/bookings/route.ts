import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUseBooking } from "@/lib/features";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canUseBooking(session.user.subscriptionPlan)) {
    return NextResponse.json({ error: "Booking system requires PREMIUM plan" }, { status: 403 });
  }

  const clubId = session.user.clubId;
  if (!clubId) return NextResponse.json({ error: "No club found" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const slotId = searchParams.get("slotId") || undefined;
  const status = searchParams.get("status") || undefined;

  const dateFilter = dateParam ? new Date(dateParam) : undefined;

  const bookings = await prisma.booking.findMany({
    where: {
      slot: { clubId },
      ...(dateFilter ? { date: dateFilter } : {}),
      ...(slotId ? { slotId } : {}),
      ...(status ? { status: status as "CONFIRMED" | "CANCELLED" } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      slot: { select: { id: true, name: true, startTime: true, endTime: true, capacity: true } },
    },
    orderBy: [{ date: "desc" }, { slot: { startTime: "asc" } }],
  });

  return NextResponse.json(bookings);
}
