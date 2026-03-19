import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateMembershipSchema } from "@/lib/validations";
import { createMembership } from "@/lib/services/membership.service";
import { logger } from "@/lib/logger";

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
    const clubId = session.user.clubId ?? null;

    const membership = await createMembership({
      userId,
      planId,
      clubId,
      startDate,
      paymentMethod,
      paymentReference,
      notes,
      adminUserId: session.user.id,
    });

    return NextResponse.json(membership, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "PLAN_NOT_FOUND") {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    logger.error("Create membership error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
