import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UpdateSlotSchema } from "@/lib/validations";
import { canUseBooking } from "@/lib/features";
import { logger } from "@/lib/logger";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canUseBooking(session.user.subscriptionPlan)) {
    return NextResponse.json({ error: "Booking system requires PREMIUM plan" }, { status: 403 });
  }

  const clubId = session.user.clubId;
  if (!clubId) return NextResponse.json({ error: "No club found" }, { status: 400 });

  const { id } = await params;

  try {
    const slot = await prisma.slot.findFirst({ where: { id, clubId } });
    if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });

    const body = await req.json();
    const parsed = UpdateSlotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { startTime, endTime } = parsed.data;
    const effectiveStart = startTime ?? slot.startTime;
    const effectiveEnd = endTime ?? slot.endTime;
    if (effectiveStart >= effectiveEnd) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    }

    const updated = await prisma.slot.update({
      where: { id },
      data: {
        name: parsed.data.name ?? slot.name,
        startTime: startTime ?? slot.startTime,
        endTime: endTime ?? slot.endTime,
        capacity: parsed.data.capacity ?? slot.capacity,
        isActive: parsed.data.isActive ?? slot.isActive,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Update slot error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canUseBooking(session.user.subscriptionPlan)) {
    return NextResponse.json({ error: "Booking system requires PREMIUM plan" }, { status: 403 });
  }

  const clubId = session.user.clubId;
  if (!clubId) return NextResponse.json({ error: "No club found" }, { status: 400 });

  const { id } = await params;

  try {
    const slot = await prisma.slot.findFirst({ where: { id, clubId } });
    if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });

    // Check for future confirmed bookings before deleting
    const futureBookings = await prisma.booking.count({
      where: { slotId: id, status: "CONFIRMED", date: { gte: new Date() } },
    });

    if (futureBookings > 0) {
      return NextResponse.json(
        { error: `Cannot delete: slot has ${futureBookings} upcoming booking(s). Cancel them first.` },
        { status: 409 }
      );
    }

    await prisma.slot.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Delete slot error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
