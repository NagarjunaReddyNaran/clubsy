import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreatePlayerSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

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
          where: { status: "ACTIVE" },
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

    // Check for duplicate email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const rawPassword = randomBytes(6).toString("hex"); // 12-char hex temp password
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const player = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone ?? null,
        password: hashedPassword,
        role: "USER",
        emailVerified: new Date(),
        ...(clubId ? { clubId } : {}),
      },
    });

    return NextResponse.json({ player, tempPassword: rawPassword }, { status: 201 });
  } catch (error) {
    console.error("Create player error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
