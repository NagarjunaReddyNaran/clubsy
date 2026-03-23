import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { logger } from "@/lib/logger";
import { z } from "zod";

const Schema = z.object({ planId: z.string().cuid() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { planId } = parsed.data;

  try {
    const plan = await prisma.plan.findUnique({
      where: { id: planId, isActive: true },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "";

    // Price is stored as Decimal — convert to cents for Stripe
    const unitAmount = Math.round(Number(plan.price) * 100);

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (plan.currency ?? "CAD").toLowerCase(),
            unit_amount: unitAmount,
            product_data: {
              name: plan.name,
              description: plan.description ?? `${plan.duration}-day membership`,
            },
          },
        },
      ],
      metadata: {
        type: "membership_payment",
        planId: plan.id,
        userId: session.user.id,
        clubId: session.user.clubId ?? "",
      },
      success_url: `${origin}/dashboard/membership?payment=success`,
      cancel_url: `${origin}/dashboard/plans?payment=canceled`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    logger.error("Membership payment checkout error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
