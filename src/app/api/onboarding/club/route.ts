import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateClubSchema } from "@/lib/validations";
import { generateInviteCode, generateSlug, TRIAL_DAYS } from "@/lib/subscription";
import { logger } from "@/lib/logger";

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

    const club = await prisma.$transaction(async (tx) => {
      const created = await tx.club.create({
        data: {
          name,
          slug,
          inviteCode,
          adminId: session.user.id,
          subscriptionStatus: "TRIAL",
          trialEndsAt,
        },
      });

      // Seed 3 default plans so the admin isn't onboarded to an empty club
      const currency = session.user.currency ?? "CAD";
      await tx.plan.createMany({
        data: [
          {
            name: "Daily Pass",
            description: "Single-day access to the club",
            duration: 1,
            price: 10,
            currency,
            features: ["Full club access", "Valid for 1 day"],
            isActive: true,
            clubId: created.id,
          },
          {
            name: "Monthly",
            description: "Standard monthly membership",
            duration: 30,
            price: 50,
            currency,
            features: ["Full club access", "Unlimited sessions", "Locker access"],
            isActive: true,
            clubId: created.id,
          },
          {
            name: "Quarterly",
            description: "3-month membership at a discounted rate",
            duration: 90,
            price: 130,
            currency,
            features: ["Full club access", "Unlimited sessions", "Locker access", "10% discount vs monthly"],
            isActive: true,
            clubId: created.id,
          },
        ],
      });

      // Link the admin user to this club
      await tx.user.update({
        where: { id: session.user.id },
        data: { clubId: created.id },
      });

      return created;
    });

    return NextResponse.json(club, { status: 201 });
  } catch (error) {
    logger.error("Create club error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
