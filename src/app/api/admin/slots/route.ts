import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateSlotSchema } from "@/lib/validations";
import { canUseBooking } from "@/lib/features";
import { logger } from "@/lib/logger";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canUseBooking(session.user.subscriptionPlan)) {
    return NextResponse.json({ error: "Booking system requires PREMIUM plan" }, { status: 403 });
  }

  const clubId = session.user.clubId;
  if (!clubId) return NextResponse.json({ error: "No club found" }, { status: 400 });

  const slots = await prisma.slot.findMany({
    where: { clubId },
    include: {
      _count: { select: { bookings: { where: { status: "CONFIRMED" } } } },
    },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(slots);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canUseBooking(session.user.subscriptionPlan)) {
    return NextResponse.json({ error: "Booking system requires PREMIUM plan" }, { status: 403 });
  }

  const clubId = session.user.clubId;
  if (!clubId) return NextResponse.json({ error: "No club found" }, { status: 400 });

  try {
    const body = await req.json();
    const parsed = CreateSlotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, startTime, endTime, capacity, isActive } = parsed.data;

    if (startTime >= endTime) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    }

    const slot = await prisma.slot.create({
      data: { name: name || null, startTime, endTime, capacity, isActive, clubId },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "SLOT_CREATED",
        entityType: "slot",
        entityId: slot.id,
        details: `Slot created: ${startTime}–${endTime} (capacity ${capacity})`,
      },
    });

    return NextResponse.json(slot, { status: 201 });
  } catch (error) {
    logger.error("Create slot error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
