import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, content } = await req.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    const clubId = session.user.clubId ?? null;

    const announcement = await prisma.announcement.create({
      data: { title, content, isActive: true, clubId },
    });

    // Notify club members only
    const users = await prisma.user.findMany({
      where: { role: "USER", ...(clubId ? { clubId } : {}) },
      select: { id: true },
    });

    if (users.length > 0) {
      await prisma.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          title: `📢 ${title}`,
          message: content.length > 200 ? content.slice(0, 200) + "…" : content,
          type: "announcement",
          isRead: false,
        })),
      });
    }

    await createAuditLog({
      userId: session.user.id,
      action: "ANNOUNCEMENT_CREATED",
      entityType: "announcement",
      entityId: announcement.id,
      details: `Announcement "${title}" sent to ${users.length} users`,
    });

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    logger.error("Create announcement error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
