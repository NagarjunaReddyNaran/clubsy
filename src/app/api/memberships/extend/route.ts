import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExtendSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = ExtendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { membershipId, days, reason } = parsed.data;

    const membership = await prisma.membership.findFirst({
      where: { id: membershipId, userId: session.user.id, status: "ACTIVE" },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Active membership not found" },
        { status: 404 }
      );
    }

    // Check for existing pending request
    const existingRequest = await prisma.extensionRequest.findFirst({
      where: {
        membershipId,
        userId: session.user.id,
        status: "PENDING",
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "You already have a pending extension request" },
        { status: 400 }
      );
    }

    const request = await prisma.extensionRequest.create({
      data: {
        userId: session.user.id,
        membershipId,
        days,
        reason: reason || null,
        status: "PENDING",
      },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    logger.error("Extension request error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
