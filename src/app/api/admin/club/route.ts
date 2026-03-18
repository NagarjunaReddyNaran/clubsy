import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UpdateClubSchema } from "@/lib/validations";
import { generateSlug } from "@/lib/subscription";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await prisma.club.findUnique({
    where: { adminId: session.user.id },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      inviteCode: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      _count: { select: { members: true } },
    },
  });

  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });
  return NextResponse.json(club);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await prisma.club.findUnique({ where: { adminId: session.user.id } });
  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  try {
    const body = await req.json();
    const parsed = UpdateClubSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.name) {
      let slug = generateSlug(parsed.data.name);
      const conflict = await prisma.club.findFirst({ where: { slug, NOT: { id: club.id } } });
      if (conflict) slug = `${slug}-${Date.now()}`;
      data.slug = slug;
    }

    const updated = await prisma.club.update({ where: { id: club.id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update club error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
