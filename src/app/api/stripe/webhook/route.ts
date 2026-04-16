import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";
import { logger } from "@/lib/logger";
import { sendEmail, getMembershipApprovedEmail } from "@/lib/email";
import { formatDateForExport } from "@/lib/export";

/**
 * In Stripe API 2026-02-25.clover, current_period_end moved from the
 * Subscription root to each SubscriptionItem. This helper handles both.
 */
function getSubscriptionPeriodEnd(sub: Stripe.Subscription): number {
  // New API version: period end is on the first subscription item
  const itemPeriodEnd = sub.items?.data?.[0]?.current_period_end;
  if (typeof itemPeriodEnd === "number" && itemPeriodEnd > 0) return itemPeriodEnd;

  // Legacy fallback: period end was on the subscription root (pre-2026)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rootPeriodEnd = (sub as any).current_period_end;
  if (typeof rootPeriodEnd === "number" && rootPeriodEnd > 0) return rootPeriodEnd;

  // Last resort: 30 days from now
  logger.error("Could not determine subscription period end", { subId: sub.id, sub });
  return Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
}

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

        // ── Member membership payment ──────────────────────────────────────────
        if (session.metadata?.type === "membership_payment") {
          const { planId, userId, clubId } = session.metadata;
          if (planId && userId) {
            const plan = await prisma.plan.findUnique({ where: { id: planId } });
            if (plan) {
              const startDate = new Date();
              const endDate = new Date();
              endDate.setDate(endDate.getDate() + plan.duration);

              // Cancel any existing active membership first
              await prisma.membership.updateMany({
                where: { userId, status: "ACTIVE" },
                data: { status: "CANCELLED" },
              });

              const membership = await prisma.membership.create({
                data: {
                  userId,
                  planId,
                  clubId: clubId || null,
                  status: "ACTIVE",
                  startDate,
                  endDate,
                },
              });

              await prisma.payment.create({
                data: {
                  userId,
                  membershipId: membership.id,
                  amount: plan.price,
                  currency: plan.currency,
                  status: "COMPLETED",
                  method: "stripe",
                  reference: session.payment_intent as string | undefined,
                  paidAt: new Date(),
                  paymentSource: "ONLINE",
                  stripeSessionId: session.id,
                  stripePaymentIntentId: session.payment_intent as string | undefined,
                  invoiceUrl: session.invoice
                    ? (await stripe!.invoices.retrieve(session.invoice as string)).hosted_invoice_url ?? undefined
                    : undefined,
                },
              });

              await prisma.notification.create({
                data: {
                  userId,
                  title: "Membership Activated",
                  message: `Your ${plan.name} membership is active until ${formatDateForExport(endDate)}.`,
                  type: "membership",
                },
              });

              const member = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true, name: true },
              });
              if (member?.email) {
                await sendEmail({
                  to: member.email,
                  subject: `Your ${plan.name} membership is now active`,
                  html: getMembershipApprovedEmail(
                    member.name ?? "Member",
                    plan.name,
                    formatDateForExport(endDate)
                  ),
                });
              }
            }
          }
          break;
        }

        // ── Admin SaaS subscription ────────────────────────────────────────────
        const clubId = session.metadata?.clubId;
        if (clubId && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          const periodEnd = getSubscriptionPeriodEnd(sub);

          // Determine plan tier from Stripe price ID
          const priceId = sub.items?.data?.[0]?.price?.id ?? "";
          const isProPlan = priceId === process.env.STRIPE_PRO_PRICE_ID;

          await prisma.club.update({
            where: { id: clubId },
            data: {
              subscriptionStatus: "ACTIVE",
              subscriptionPlan: isProPlan ? "PREMIUM" : "BASIC",
              stripeSubscriptionId: sub.id,
              currentPeriodEnd: new Date(periodEnd * 1000),
            },
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const periodEnd = getSubscriptionPeriodEnd(sub);
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
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subId = (invoice as any).subscription as string | null;
        if (!subId) break;
        const sub = await stripe.subscriptions.retrieve(subId);
        const periodEnd = getSubscriptionPeriodEnd(sub);
        const club = await prisma.club.findFirst({ where: { stripeSubscriptionId: subId } });
        if (club) {
          await prisma.club.update({
            where: { id: club.id },
            data: {
              subscriptionStatus: "ACTIVE",
              currentPeriodEnd: new Date(periodEnd * 1000),
            },
          });
        }
        break;
      }
    }
  } catch (err) {
    logger.error("Webhook handler error", { error: err });
    // Return 500 so Stripe retries the webhook instead of silently dropping it
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
