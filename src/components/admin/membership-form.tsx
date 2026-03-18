"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, type CurrencyCode } from "@/lib/currency";

interface Player {
  id: string;
  name: string | null;
  email: string;
}

interface Plan {
  id: string;
  name: string;
  price: string | number | { toNumber: () => number };
  duration: number;
  currency?: string;
}

interface MembershipFormProps {
  players: Player[];
  plans: Plan[];
}

export function MembershipForm({ players, plans }: MembershipFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState({
    userId: "",
    planId: "",
    startDate: today,
    paymentMethod: "cash",
    paymentReference: "",
    notes: "",
  });

  const selectedPlan = plans.find((p) => p.id === formData.planId);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create membership");
      } else {
        router.push("/admin/memberships");
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Player</label>
            <select
              name="userId"
              value={formData.userId}
              onChange={handleChange}
              required
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a player</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Plan</label>
            <select
              name="planId"
              value={formData.planId}
              onChange={handleChange}
              required
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatCurrency(p.price, (p.currency ?? "CAD") as CurrencyCode)} / {p.duration} days
                </option>
              ))}
            </select>
          </div>

          {selectedPlan && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              Plan price: <strong>{formatCurrency(selectedPlan.price, (selectedPlan.currency ?? "CAD") as CurrencyCode)}</strong> for{" "}
              <strong>{selectedPlan.duration} days</strong>
            </div>
          )}

          <Input
            id="startDate"
            name="startDate"
            label="Start Date"
            type="date"
            value={formData.startDate}
            onChange={handleChange}
            required
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Payment Method</label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>

          <Input
            id="paymentReference"
            name="paymentReference"
            label="Payment Reference (optional)"
            value={formData.paymentReference}
            onChange={handleChange}
            placeholder="Transaction ID, receipt number..."
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Any additional notes"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>
              Create Membership
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
