import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  const { inviteCode } = await params;

  const club = await prisma.club.findUnique({
    where: { inviteCode },
    select: { id: true, name: true, logoUrl: true, _count: { select: { members: true } } },
  });

  if (!club) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  return NextResponse.json(club);
}
