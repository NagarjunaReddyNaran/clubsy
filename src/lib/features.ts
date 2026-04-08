/**
 * Feature gating based on subscription plan.
 *
 * TRIAL / STARTER: up to 50 players, BASIC features only
 * PRO / PREMIUM:   unlimited players + slot booking system
 *
 * Extend this file as Stripe products and feature flags evolve.
 */

import type { SubscriptionStatus, SubscriptionPlan } from "@prisma/client";

const PLAYER_LIMITS: Record<string, number> = {
  TRIAL: 50,
  ACTIVE: Infinity, // fully subscribed — no limit
  EXPIRED: 0,
  CANCELLED: 0,
};

export function getPlayerLimit(subscriptionStatus: SubscriptionStatus | string | null): number {
  if (!subscriptionStatus) return 0;
  return PLAYER_LIMITS[subscriptionStatus] ?? 0;
}

export function canAddPlayer(
  currentPlayerCount: number,
  subscriptionStatus: SubscriptionStatus | string | null
): boolean {
  const limit = getPlayerLimit(subscriptionStatus);
  return currentPlayerCount < limit;
}

/**
 * Returns true if the club's subscription plan is PREMIUM.
 * This gates the slot booking system.
 */
export function canUseBooking(
  subscriptionPlan: SubscriptionPlan | string | null | undefined
): boolean {
  return subscriptionPlan === "PREMIUM";
}
