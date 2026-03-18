import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

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
    const { action, reviewNote } = await req.json();

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const extensionRequest = await prisma.extensionRequest.findUnique({
      where: { id },
      include: { membership: true, user: { select: { name: true } } },
    });

    if (!extensionRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (extensionRequest.status !== "PENDING") {
      return NextResponse.json({ error: "Request already reviewed" }, { status: 400 });
    }

    const approved = action === "approve";

    await prisma.extensionRequest.update({
      where: { id },
      data: {
        status: approved ? "APPROVED" : "REJECTED",
        reviewedBy: session.user.id,
        reviewNote: reviewNote || null,
      },
    });

    if (approved) {
      const membership = extensionRequest.membership;
      const currentEnd = new Date(membership.endDate);
      currentEnd.setDate(currentEnd.getDate() + extensionRequest.days);

      await prisma.membership.update({
        where: { id: membership.id },
        data: { endDate: currentEnd },
      });
    }

    // Notify the player
    await prisma.notification.create({
      data: {
        userId: extensionRequest.userId,
        title: approved ? "Extension Approved ✓" : "Extension Rejected",
        message: approved
          ? `Your request for a ${extensionRequest.days}-day extension has been approved.`
          : `Your request for a ${extensionRequest.days}-day extension was not approved.${reviewNote ? ` Reason: ${reviewNote}` : ""}`,
        type: "extension",
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: approved ? "EXTENSION_APPROVED" : "EXTENSION_REJECTED",
      entityType: "extension_request",
      entityId: id,
      details: `${approved ? "Approved" : "Rejected"} ${extensionRequest.days}-day extension for ${extensionRequest.user.name}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Extension review error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
