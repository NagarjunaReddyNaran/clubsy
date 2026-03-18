import Stripe from "stripe";

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-02-25.clover" })
  : null;

export const STRIPE_PLANS = {
  STARTER: {
    name: "Starter",
    price: 2900,
    priceId: process.env.STRIPE_STARTER_PRICE_ID ?? "",
    features: ["Up to 50 players", "All core features", "Email support"],
  },
  PRO: {
    name: "Pro",
    price: 7900,
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
    features: ["Unlimited players", "All core features", "Priority support", "Custom branding"],
  },
} as const;

export type StripePlan = keyof typeof STRIPE_PLANS;
