import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { formatDateForExport } from "@/lib/export";
import { CreateMembershipSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.membership.findMany({
    include: {
      user: { select: { name: true, email: true } },
      plan: { select: { name: true, price: true, currency: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(memberships);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = CreateMembershipSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { userId, planId, startDate, paymentMethod, paymentReference, notes } = parsed.data;

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const start = new Date(startDate);
    const end = new Date(startDate);
    end.setDate(end.getDate() + plan.duration);

    const clubId = session.user.clubId ?? null;

    const membership = await prisma.membership.create({
      data: {
        userId,
        planId,
        clubId,
        status: "ACTIVE",
        startDate: start,
        endDate: end,
        notes: notes || null,
      },
    });

    await prisma.payment.create({
      data: {
        userId,
        membershipId: membership.id,
        amount: plan.price,
        currency: plan.currency,
        status: "COMPLETED",
        method: paymentMethod || "cash",
        reference: paymentReference || null,
        paidAt: new Date(),
      },
    });

    // Notify the player
    await prisma.notification.create({
      data: {
        userId,
        title: "Membership Activated",
        message: `Your ${plan.name} membership is active until ${formatDateForExport(end)}.`,
        type: "membership",
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "MEMBERSHIP_CREATED",
      entityType: "membership",
      entityId: membership.id,
      details: `Created ${plan.name} for user ${userId}`,
    });

    return NextResponse.json(membership, { status: 201 });
  } catch (error) {
    console.error("Create membership error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
