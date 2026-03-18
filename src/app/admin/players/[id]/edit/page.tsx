"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  duration: number;
  price: number;
  currency: string;
}

interface ActiveMembership {
  id: string;
  planId: string;
  plan: { name: string };
}

export default function EditPlayerPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [form, setForm] = useState({ name: "", phone: "" });
  const [email, setEmail] = useState("");
  const [activeMembership, setActiveMembership] = useState<ActiveMembership | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/players/${id}`).then((r) => r.json()),
      fetch("/api/admin/plans").then((r) => r.json()),
    ])
      .then(([player, plansData]) => {
        setForm({ name: player.name ?? "", phone: player.phone ?? "" });
        setEmail(player.email ?? "");
        const active = (player.memberships ?? []).find((m: { status: string }) => m.status === "ACTIVE") ?? null;
        setActiveMembership(active);
        setSelectedPlanId(active?.planId ?? "");
        const activePlans = Array.isArray(plansData)
          ? plansData.filter((p: Plan & { isActive: boolean }) => p.isActive)
          : [];
        setPlans(activePlans);
      })
      .catch(() => setError("Failed to load player data"))
      .finally(() => setFetching(false));
  }, [id]);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    try {
      // Update player profile
      const res = await fetch(`/api/admin/players/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, phone: form.phone || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update player");
        return;
      }

      // Assign new plan if changed
      const planChanged = selectedPlanId && selectedPlanId !== activeMembership?.planId;
      if (planChanged) {
        await fetch("/api/admin/memberships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: id,
            planId: selectedPlanId,
            startDate: new Date().toISOString().split("T")[0],
          }),
        });
      }

      setSuccess(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="max-w-md space-y-4">
        <div className="h-8 bg-gray-100 rounded animate-pulse w-48" />
        <div className="h-72 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/players" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Player</h1>
          <p className="text-sm text-gray-500">{email}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                Player updated successfully.
              </div>
            )}

            <Input
              id="name"
              label="Full name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
            <Input
              id="email-readonly"
              label="Email (cannot be changed)"
              value={email}
              disabled
              className="opacity-60"
            />
            <Input
              id="phone"
              label="Phone number"
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+1 (555) 000-0000"
            />

            {/* Plan select */}
            <div className="flex flex-col gap-1">
              <label htmlFor="planId" className="text-sm font-medium text-gray-700">
                Current plan
              </label>
              <select
                id="planId"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">— No plan —</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.duration} days · {p.currency} {Number(p.price).toFixed(2)}
                  </option>
                ))}
              </select>
              {selectedPlanId && selectedPlanId !== (activeMembership?.planId ?? "") && (
                <p className="text-xs text-blue-600">
                  A new membership will be created with this plan starting today.
                </p>
              )}
              {activeMembership && (
                <p className="text-xs text-gray-400">
                  Currently active: <span className="font-medium text-gray-600">{activeMembership.plan.name}</span>
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => router.push("/admin/players")}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" loading={loading}>Save changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
