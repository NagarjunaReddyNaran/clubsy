import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  try {
    const club = await prisma.club.findUnique({
      where: { adminId: session.user.id },
      select: { stripeCustomerId: true },
    });

    if (!club?.stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer found" }, { status: 400 });
    }

    const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: club.stripeCustomerId,
      return_url: `${origin}/admin/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    logger.error("Stripe portal error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
