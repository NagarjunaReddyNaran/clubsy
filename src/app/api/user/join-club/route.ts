import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only non-admin users can join a club via invite
  if (session.user.role === "ADMIN") {
    return NextResponse.json({ error: "Admins cannot join clubs as members" }, { status: 400 });
  }

  const { inviteCode } = await req.json();
  if (!inviteCode) {
    return NextResponse.json({ error: "Invite code required" }, { status: 400 });
  }

  const club = await prisma.club.findUnique({ where: { inviteCode } });
  if (!club) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { clubId: club.id },
  });

  return NextResponse.json({ clubId: club.id, clubName: club.name });
}
