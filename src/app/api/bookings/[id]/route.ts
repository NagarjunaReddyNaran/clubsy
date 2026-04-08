import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUseBooking } from "@/lib/features";
import { logger } from "@/lib/logger";

/**
 * DELETE /api/bookings/[id]
 * Cancels a booking. Player can cancel their own; admin can cancel any in their club.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!canUseBooking(session.user.subscriptionPlan)) {
    return NextResponse.json({ error: "Booking system requires PREMIUM plan" }, { status: 403 });
  }

  const { id } = await params;
  const isAdmin = session.user.role === "ADMIN";
  const clubId = session.user.clubId;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        slot: { select: { clubId: true, startTime: true, endTime: true } },
      },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    // Players can only cancel their own; admins can cancel any in their club
    if (!isAdmin && booking.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isAdmin && booking.slot.clubId !== clubId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent cancelling past bookings (players only; admin override allowed)
    if (!isAdmin) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (booking.date < today) {
        return NextResponse.json({ error: "Cannot cancel a past booking" }, { status: 400 });
      }
    }

    if (booking.status === "CANCELLED") {
      return NextResponse.json({ error: "Booking is already cancelled" }, { status: 400 });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    // Notify the player if admin cancelled on their behalf
    if (isAdmin && booking.userId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: booking.userId,
          title: "Booking Cancelled",
          message: `Your booking for slot ${booking.slot.startTime}–${booking.slot.endTime} has been cancelled by the admin.`,
          type: "booking",
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "BOOKING_CANCELLED",
        entityType: "booking",
        entityId: id,
        details: `Booking cancelled by ${isAdmin ? "admin" : "player"}`,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Cancel booking error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
