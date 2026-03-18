import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateClubSchema } from "@/lib/validations";
import { generateInviteCode, generateSlug, TRIAL_DAYS } from "@/lib/subscription";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin can only create one club
  const existing = await prisma.club.findUnique({ where: { adminId: session.user.id } });
  if (existing) {
    return NextResponse.json({ error: "Club already exists" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const parsed = CreateClubSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name } = parsed.data;

    // Generate unique slug
    let slug = generateSlug(name);
    const slugConflict = await prisma.club.findUnique({ where: { slug } });
    if (slugConflict) slug = `${slug}-${Date.now()}`;

    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const inviteCode = generateInviteCode();

    const club = await prisma.club.create({
      data: {
        name,
        slug,
        inviteCode,
        adminId: session.user.id,
        subscriptionStatus: "TRIAL",
        trialEndsAt,
      },
    });

    return NextResponse.json(club, { status: 201 });
  } catch (error) {
    console.error("Create club error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
