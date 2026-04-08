import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateBookingSchema } from "@/lib/validations";
import { canUseBooking } from "@/lib/features";
import { logger } from "@/lib/logger";

/**
 * GET /api/bookings
 * Returns the current user's bookings (upcoming by default, ?all=true for history).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clubId = session.user.clubId;
  if (!clubId) return NextResponse.json({ error: "Not a club member" }, { status: 400 });

  if (!canUseBooking(session.user.subscriptionPlan)) {
    return NextResponse.json({ error: "Booking system requires PREMIUM plan" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const showAll = searchParams.get("all") === "true";

  const bookings = await prisma.booking.findMany({
    where: {
      userId: session.user.id,
      ...(showAll ? {} : { date: { gte: new Date() }, status: "CONFIRMED" }),
    },
    include: {
      slot: { select: { name: true, startTime: true, endTime: true } },
    },
    orderBy: [{ date: "asc" }, { slot: { startTime: "asc" } }],
  });

  return NextResponse.json(bookings);
}

/**
 * POST /api/bookings
 * Books a slot for the current player on a given date.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clubId = session.user.clubId;
  if (!clubId) return NextResponse.json({ error: "Not a club member" }, { status: 400 });

  if (!canUseBooking(session.user.subscriptionPlan)) {
    return NextResponse.json({ error: "Booking system requires PREMIUM plan" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = CreateBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { slotId, date: dateStr } = parsed.data;

    // Parse date — treat as local calendar day (midnight UTC)
    const date = new Date(dateStr + "T00:00:00.000Z");

    // Prevent booking in the past
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (date < today) {
      return NextResponse.json({ error: "Cannot book a slot in the past" }, { status: 400 });
    }

    // Verify slot belongs to the player's club
    const slot = await prisma.slot.findFirst({
      where: { id: slotId, clubId, isActive: true },
    });
    if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });

    // Verify player has an ACTIVE membership with slotAccess
    const membership = await prisma.membership.findFirst({
      where: {
        userId: session.user.id,
        clubId,
        status: "ACTIVE",
        endDate: { gte: new Date() },
        plan: { slotAccess: true },
      },
      include: { plan: true },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "Your current membership plan does not include slot booking" },
        { status: 403 }
      );
    }

    const plan = membership.plan;

    // Check weekly limit if plan has one
    if (plan.maxBookingsPerWeek) {
      const startOfWeek = new Date(date);
      startOfWeek.setUTCDate(date.getUTCDate() - date.getUTCDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);

      const weeklyCount = await prisma.booking.count({
        where: {
          userId: session.user.id,
          status: "CONFIRMED",
          date: { gte: startOfWeek, lte: endOfWeek },
        },
      });
      if (weeklyCount >= plan.maxBookingsPerWeek) {
        return NextResponse.json(
          {
            error: `Weekly booking limit reached (${plan.maxBookingsPerWeek} per week on your plan)`,
          },
          { status: 403 }
        );
      }
    }

    // Check active bookings limit if plan has one
    if (plan.maxActiveBookings) {
      const activeCount = await prisma.booking.count({
        where: {
          userId: session.user.id,
          status: "CONFIRMED",
          date: { gte: today },
        },
      });
      if (activeCount >= plan.maxActiveBookings) {
        return NextResponse.json(
          { error: `You can only have ${plan.maxActiveBookings} upcoming booking(s) at a time` },
          { status: 403 }
        );
      }
    }

    // Use a transaction to atomically check capacity and create booking
    const booking = await prisma.$transaction(async (tx) => {
      const confirmedCount = await tx.booking.count({
        where: { slotId, date, status: "CONFIRMED" },
      });

      if (confirmedCount >= slot.capacity) {
        throw new Error("SLOT_FULL");
      }

      return tx.booking.create({
        data: { userId: session.user.id, slotId, date, status: "CONFIRMED" },
        include: { slot: { select: { name: true, startTime: true, endTime: true } } },
      });
    });

    // Notify player
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: "Booking Confirmed",
        message: `Your slot ${booking.slot.startTime}–${booking.slot.endTime} on ${dateStr} is confirmed.`,
        type: "booking",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "BOOKING_CREATED",
        entityType: "booking",
        entityId: booking.id,
        details: `Slot ${slotId} booked for ${dateStr}`,
      },
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_FULL") {
      return NextResponse.json({ error: "This slot is fully booked" }, { status: 409 });
    }
    // Prisma unique constraint: duplicate booking
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "You already have a booking for this slot on this date" },
        { status: 409 }
      );
    }
    logger.error("Create booking error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
