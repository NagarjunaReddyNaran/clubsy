"use client";

import Link from "next/link";
import { getDaysUntilTrialEnd, isSubscriptionActive } from "@/lib/subscription";
import { AlertCircle, Zap } from "lucide-react";

interface SubscriptionBannerProps {
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
}

export function SubscriptionBanner({ subscriptionStatus, trialEndsAt }: SubscriptionBannerProps) {
  if (!subscriptionStatus) return null;
  if (isSubscriptionActive(subscriptionStatus, trialEndsAt) && subscriptionStatus === "ACTIVE") return null;

  const daysLeft = getDaysUntilTrialEnd(trialEndsAt);

  if (subscriptionStatus === "TRIAL" && daysLeft > 3) return null; // only show when < 4 days left

  const isExpired = subscriptionStatus === "EXPIRED" || subscriptionStatus === "CANCELLED" ||
    (subscriptionStatus === "TRIAL" && daysLeft === 0);

  return (
    <div className={`px-4 py-2 text-sm flex flex-wrap items-center justify-between gap-x-3 gap-y-1 ${
      isExpired
        ? "bg-red-600 text-white"
        : "bg-yellow-50 border-b border-yellow-200 text-yellow-800"
    }`}>
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        {isExpired ? (
          <span>Your subscription has expired. Upgrade to restore full access.</span>
        ) : (
          <span>
            Free trial ends in <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""}</strong>. Upgrade to keep using Clubsy.
          </span>
        )}
      </div>
      <Link
        href="/admin/billing"
        className={`flex items-center gap-1 font-medium whitespace-nowrap hover:underline ${
          isExpired ? "text-white" : "text-yellow-900"
        }`}
      >
        <Zap className="w-3.5 h-3.5" />
        Upgrade
      </Link>
    </div>
  );
}
