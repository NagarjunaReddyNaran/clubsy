import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const { name, description, duration, price, maxSessions, features, isActive } =
      await req.json();

    const plan = await prisma.plan.update({
      where: { id },
      data: {
        name,
        description: description || null,
        duration: parseInt(duration),
        price: parseFloat(price),
        maxSessions: maxSessions || null,
        features: features || [],
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Update plan error:", error);
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

  try {
    await prisma.plan.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "Plan deactivated" });
  } catch (error) {
    console.error("Delete plan error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
