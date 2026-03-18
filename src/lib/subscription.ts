import type { SubscriptionStatus } from "@prisma/client";

export const TRIAL_DAYS = 14;

export function isSubscriptionActive(
  status: SubscriptionStatus | string | null,
  trialEndsAt: Date | string | null
): boolean {
  if (!status) return false;
  if (status === "ACTIVE") return true;
  if (status === "TRIAL") {
    if (!trialEndsAt) return false;
    return new Date(trialEndsAt) > new Date();
  }
  return false;
}

export function getDaysUntilTrialEnd(trialEndsAt: Date | string | null): number {
  if (!trialEndsAt) return 0;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 60);
}
