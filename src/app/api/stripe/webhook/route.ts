import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    logger.error("Webhook signature error", { error: err });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const clubId = session.metadata?.clubId;
        if (clubId && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          const periodEnd = (sub as unknown as { current_period_end: number }).current_period_end;
          await prisma.club.update({
            where: { id: clubId },
            data: {
              subscriptionStatus: "ACTIVE",
              stripeSubscriptionId: sub.id,
              currentPeriodEnd: new Date(periodEnd * 1000),
            },
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const periodEnd = (sub as unknown as { current_period_end: number }).current_period_end;
        const club = await prisma.club.findFirst({ where: { stripeSubscriptionId: sub.id } });
        if (club) {
          await prisma.club.update({
            where: { id: club.id },
            data: {
              subscriptionStatus: sub.status === "active" ? "ACTIVE" : "EXPIRED",
              currentPeriodEnd: new Date(periodEnd * 1000),
            },
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const club = await prisma.club.findFirst({ where: { stripeSubscriptionId: sub.id } });
        if (club) {
          await prisma.club.update({
            where: { id: club.id },
            data: { subscriptionStatus: "CANCELLED" },
          });
        }
        break;
      }
    }
  } catch (err) {
    logger.error("Webhook handler error", { error: err });
  }

  return NextResponse.json({ received: true });
}
