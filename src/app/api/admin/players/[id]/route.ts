import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UpdatePlayerSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const clubId = session.user.clubId;

  const player = await prisma.user.findFirst({
    where: { id, role: "USER", deletedAt: null, ...(clubId ? { clubId } : {}) },
    include: {
      memberships: {
        include: { plan: { select: { name: true, currency: true } } },
        orderBy: { createdAt: "desc" },
      },
      payments: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  return NextResponse.json(player);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const clubId = session.user.clubId;

  const existing = await prisma.user.findFirst({
    where: { id, role: "USER", deletedAt: null, ...(clubId ? { clubId } : {}) },
  });
  if (!existing) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  try {
    const body = await req.json();
    const parsed = UpdatePlayerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({ where: { id }, data: parsed.data });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Update player error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const clubId = session.user.clubId;

  const existing = await prisma.user.findFirst({
    where: { id, role: "USER", deletedAt: null, ...(clubId ? { clubId } : {}) },
  });
  if (!existing) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}
