import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PatchMembershipSchema } from "@/lib/validations";
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
  const membership = await prisma.membership.findUnique({
    where: { id },
    include: {
      user: true,
      plan: true,
      payments: { orderBy: { createdAt: "desc" } },
      extensionRequests: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  return NextResponse.json(membership);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = PatchMembershipSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const membership = await prisma.membership.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(membership);
  } catch (error) {
    logger.error("Update membership error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
