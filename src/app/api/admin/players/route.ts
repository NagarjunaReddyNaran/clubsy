import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreatePlayerSchema } from "@/lib/validations";
import { createPlayer } from "@/lib/services/player.service";
import { canAddPlayer } from "@/lib/features";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20");
  const clubId = session.user.clubId;

  const where = {
    role: "USER" as const,
    deletedAt: null,
    ...(clubId ? { clubId } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [players, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        memberships: {
          where: { status: "ACTIVE", endDate: { gte: new Date() } },
          include: { plan: { select: { name: true } } },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ data: players, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = CreatePlayerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, phone } = parsed.data;
    const clubId = session.user.clubId;

    // Feature gate: enforce player limit based on subscription
    const currentCount = await prisma.user.count({
      where: { role: "USER", deletedAt: null, ...(clubId ? { clubId } : {}) },
    });
    if (!canAddPlayer(currentCount, session.user.subscriptionStatus ?? null)) {
      return NextResponse.json(
        { error: "Player limit reached for your current plan. Please upgrade to add more players." },
        { status: 403 }
      );
    }

    const result = await createPlayer({ name, email, phone, clubId: clubId ?? null });
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "DUPLICATE_EMAIL") {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }
    logger.error("Create player error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
