import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe, STRIPE_PLANS, type StripePlan } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment." },
      { status: 503 }
    );
  }

  const { plan } = await req.json() as { plan: StripePlan };
  if (!STRIPE_PLANS[plan]) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const club = await prisma.club.findUnique({ where: { adminId: session.user.id } });
  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  let customerId = club.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email ?? undefined,
      name: session.user.name ?? undefined,
      metadata: { clubId: club.id, adminId: session.user.id },
    });
    customerId = customer.id;
    await prisma.club.update({ where: { id: club.id }, data: { stripeCustomerId: customerId } });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: STRIPE_PLANS[plan].priceId, quantity: 1 }],
    success_url: `${origin}/admin/billing?success=true`,
    cancel_url: `${origin}/admin/billing?canceled=true`,
    metadata: { clubId: club.id },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
