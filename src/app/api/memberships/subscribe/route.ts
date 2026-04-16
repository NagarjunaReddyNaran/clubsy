import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubscribeSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = SubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { planId } = parsed.data;

    const plan = await prisma.plan.findUnique({
      where: { id: planId, isActive: true },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Deactivate existing active membership if any
    await prisma.membership.updateMany({
      where: { userId: session.user.id, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);

    const membership = await prisma.membership.create({
      data: {
        userId: session.user.id,
        planId,
        clubId: session.user.clubId ?? null,
        status: "ACTIVE",
        startDate,
        endDate,
      },
    });

    // Create pending payment (player will pay at counter)
    await prisma.payment.create({
      data: {
        userId: session.user.id,
        membershipId: membership.id,
        amount: plan.price,
        status: "PENDING",
        method: "pending",
        paymentSource: "OFFLINE",
      },
    });

    return NextResponse.json(membership, { status: 201 });
  } catch (error) {
    logger.error("Subscribe error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
