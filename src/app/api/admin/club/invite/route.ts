import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/subscription";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await prisma.club.findUnique({ where: { adminId: session.user.id } });
  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  const inviteCode = generateInviteCode();
  const updated = await prisma.club.update({
    where: { id: club.id },
    data: { inviteCode },
    select: { inviteCode: true },
  });

  return NextResponse.json(updated);
}
