"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/context/currency-context";
import type { CurrencyCode } from "@/lib/currency";

interface SubscribeButtonProps {
  planId: string;
  planName: string;
  price: number;
  currency: CurrencyCode;
  isCurrentPlan: boolean;
  hasActiveMembership: boolean;
}

export function SubscribeButton({
  planId,
  planName,
  price,
  currency,
  isCurrentPlan,
  hasActiveMembership,
}: SubscribeButtonProps) {
  const router = useRouter();
  const { format } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/memberships/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to subscribe");
      } else {
        setShowConfirm(false);
        router.push("/dashboard/membership");
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (isCurrentPlan) {
    return (
      <Button variant="secondary" className="w-full" disabled>
        Current Plan
      </Button>
    );
  }

  if (showConfirm) {
    return (
      <div className="space-y-3">
        <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
          Subscribe to <strong>{planName}</strong> for{" "}
          <strong>{format(price, currency)}</strong>?
          <p className="text-xs text-blue-600 mt-1">Payment will be collected at the counter.</p>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" loading={loading} onClick={handleSubscribe} className="flex-1">
            Confirm
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setShowConfirm(false); setError(""); }}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      className="w-full"
      variant={hasActiveMembership ? "outline" : "primary"}
      onClick={() => setShowConfirm(true)}
    >
      {hasActiveMembership ? "Switch to this plan" : "Subscribe now"}
    </Button>
  );
}
