"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STRIPE_PLANS } from "@/lib/stripe";
import { getDaysUntilTrialEnd } from "@/lib/subscription";
import { CheckCircle2, Zap } from "lucide-react";

interface BillingCardProps {
  subscriptionStatus: string;
  trialEndsAt: string | null;
  currentPeriodEnd: Date | null;
  stripeConfigured: boolean;
}

export function BillingCard({
  subscriptionStatus,
  trialEndsAt,
  currentPeriodEnd,
  stripeConfigured,
}: BillingCardProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const daysLeft = getDaysUntilTrialEnd(trialEndsAt);

  async function subscribe(plan: keyof typeof STRIPE_PLANS) {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start checkout");
      }
    } finally {
      setLoading(null);
    }
  }

  const statusBadge = {
    TRIAL: <Badge variant="warning">Trial</Badge>,
    ACTIVE: <Badge variant="success">Active</Badge>,
    EXPIRED: <Badge variant="danger">Expired</Badge>,
    CANCELLED: <Badge variant="default">Cancelled</Badge>,
  }[subscriptionStatus] ?? <Badge variant="default">Unknown</Badge>;

  return (
    <div className="space-y-6">
      {/* Current status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Subscription Status</h2>
            {statusBadge}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          {subscriptionStatus === "TRIAL" && trialEndsAt && (
            <p>
              Your free trial ends in{" "}
              <strong className={daysLeft <= 3 ? "text-red-600" : "text-gray-900"}>
                {daysLeft} day{daysLeft !== 1 ? "s" : ""}
              </strong>
              . Subscribe to continue using Clubsy after the trial.
            </p>
          )}
          {subscriptionStatus === "ACTIVE" && currentPeriodEnd && (
            <p>
              Your subscription renews on{" "}
              <strong>{new Date(currentPeriodEnd).toLocaleDateString()}</strong>.
            </p>
          )}
          {subscriptionStatus === "EXPIRED" && (
            <p className="text-red-600">
              Your subscription has expired. Upgrade to restore full access.
            </p>
          )}
          {subscriptionStatus === "CANCELLED" && (
            <p className="text-gray-500">Your subscription has been cancelled.</p>
          )}
        </CardContent>
      </Card>

      {/* Pricing plans */}
      {subscriptionStatus !== "ACTIVE" && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Choose a plan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(Object.entries(STRIPE_PLANS) as [keyof typeof STRIPE_PLANS, (typeof STRIPE_PLANS)[keyof typeof STRIPE_PLANS]][]).map(([key, plan]) => (
              <Card key={key} className={key === "PRO" ? "border-blue-400 shadow-md" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                    {key === "PRO" && <Badge variant="info">Popular</Badge>}
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-bold text-gray-900">
                      ${(plan.price / 100).toFixed(0)}
                    </span>
                    <span className="text-gray-500 text-sm">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    onClick={() => subscribe(key)}
                    loading={loading === key}
                    disabled={!stripeConfigured || loading !== null}
                  >
                    <Zap className="w-4 h-4" />
                    {stripeConfigured ? "Subscribe" : "Stripe not configured"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {!stripeConfigured && (
            <p className="mt-3 text-xs text-gray-400 text-center">
              Add <code>STRIPE_SECRET_KEY</code> and price IDs to your <code>.env</code> to enable payments.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
