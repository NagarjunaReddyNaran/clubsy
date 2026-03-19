import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { reviewExtensionRequest } from "@/lib/services/membership.service";
import { logger } from "@/lib/logger";

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

    await reviewExtensionRequest({
      extensionRequestId: id,
      approved: action === "approve",
      reviewNote,
      adminUserId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "NOT_FOUND") {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (err.code === "ALREADY_REVIEWED") {
      return NextResponse.json({ error: "Request already reviewed" }, { status: 400 });
    }
    logger.error("Extension review error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
