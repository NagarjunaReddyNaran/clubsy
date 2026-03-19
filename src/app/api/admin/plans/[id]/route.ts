import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  return NextResponse.json(plan);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { name, description, duration, price, currency, maxSessions, features, isActive } =
      await req.json();

    const plan = await prisma.plan.update({
      where: { id },
      data: {
        name,
        description: description || null,
        duration: parseInt(duration),
        price: parseFloat(price),
        ...(currency ? { currency } : {}),
        maxSessions: maxSessions || null,
        features: features || [],
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    logger.error("Update plan error", { error });
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

  const { id } = await params;
  const clubId = session.user.clubId;

  try {
    const plan = await prisma.plan.findFirst({
      where: { id, ...(clubId ? { clubId } : {}) },
    });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const membershipCount = await prisma.membership.count({ where: { planId: id } });

    if (membershipCount === 0) {
      // Safe to hard-delete — no memberships reference this plan
      await prisma.plan.delete({ where: { id } });
      return NextResponse.json({ message: "Plan deleted" });
    } else {
      // Memberships exist — deactivate so history is preserved
      await prisma.plan.update({ where: { id }, data: { isActive: false } });
      return NextResponse.json({ message: "Plan deactivated", deactivated: true });
    }
  } catch (error) {
    logger.error("Delete plan error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
