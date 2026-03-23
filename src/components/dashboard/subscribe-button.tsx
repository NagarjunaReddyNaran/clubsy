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
  stripeConfigured: boolean;
}

export function SubscribeButton({
  planId,
  planName,
  price,
  currency,
  isCurrentPlan,
  hasActiveMembership,
  stripeConfigured,
}: SubscribeButtonProps) {
  const router = useRouter();
  const { format } = useCurrency();
  const [loading, setLoading] = useState<"counter" | "stripe" | null>(null);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  async function handlePayAtCounter() {
    setLoading("counter");
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
      setLoading(null);
    }
  }

  async function handlePayOnline() {
    setLoading("stripe");
    setError("");
    try {
      const res = await fetch("/api/memberships/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to start payment");
        setLoading(null);
      }
    } catch {
      setError("Something went wrong");
      setLoading(null);
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
          <strong>{format(price, currency)}</strong>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex flex-col gap-2">
          {stripeConfigured && (
            <Button
              size="sm"
              loading={loading === "stripe"}
              disabled={loading !== null}
              onClick={handlePayOnline}
              className="w-full"
            >
              Pay online
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            loading={loading === "counter"}
            disabled={loading !== null}
            onClick={handlePayAtCounter}
            className="w-full"
          >
            Pay at counter
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setShowConfirm(false); setError(""); }}
            disabled={loading !== null}
            className="w-full text-gray-500"
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
