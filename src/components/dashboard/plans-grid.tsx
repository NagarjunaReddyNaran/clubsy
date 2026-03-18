"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useCurrency } from "@/context/currency-context";
import { SubscribeButton } from "./subscribe-button";
import { CheckCircle2 } from "lucide-react";
import type { CurrencyCode } from "@/lib/currency";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  currency: string;
  maxSessions: number | null;
  features: string[];
}

interface PlansGridProps {
  plans: Plan[];
  activePlanId: string | null;
}

export function PlansGrid({ plans, activePlanId }: PlansGridProps) {
  const { format } = useCurrency();

  if (plans.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No plans available at the moment. Check back soon!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {plans.map((plan) => {
        const isCurrentPlan = activePlanId === plan.id;
        return (
          <Card
            key={plan.id}
            className={`relative flex flex-col ${isCurrentPlan ? "ring-2 ring-blue-500" : ""}`}
          >
            {isCurrentPlan && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
                  Current Plan
                </span>
              </div>
            )}
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
              {plan.description && (
                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
              )}
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
              <div className="space-y-4 flex-1">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-bold text-gray-900">
                      {format(plan.price, plan.currency as CurrencyCode)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    for {plan.duration} days
                    {plan.maxSessions ? ` • ${plan.maxSessions} sessions` : ""}
                  </p>
                </div>

                <div className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <SubscribeButton
                  planId={plan.id}
                  planName={plan.name}
                  price={plan.price}
                  currency={plan.currency as CurrencyCode}
                  isCurrentPlan={isCurrentPlan}
                  hasActiveMembership={!!activePlanId}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
