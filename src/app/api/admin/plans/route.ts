import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreatePlanSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plans = await prisma.plan.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = CreatePlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      duration,
      price,
      currency,
      maxSessions,
      features,
      isActive,
      slotAccess,
      maxBookingsPerWeek,
      maxActiveBookings,
    } = parsed.data;
    const clubId = session.user.clubId ?? undefined;

    const plan = await prisma.plan.create({
      data: {
        name,
        description: description || null,
        duration,
        price,
        currency,
        maxSessions: maxSessions ?? null,
        features,
        isActive,
        slotAccess: slotAccess ?? false,
        maxBookingsPerWeek: maxBookingsPerWeek ?? null,
        maxActiveBookings: maxActiveBookings ?? null,
        clubId: clubId ?? null,
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    logger.error("Create plan error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
