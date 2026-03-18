"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowLeft, Copy, Check } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  duration: number;
  price: number;
  currency: string;
}

export default function NewPlayerPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", planId: "" });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ name: string; email: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/admin/plans")
      .then((r) => r.json())
      .then((data) => setPlans(Array.isArray(data) ? data.filter((p: Plan & { isActive: boolean }) => p.isActive) : []))
      .catch(() => {});
  }, []);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // 1. Create player
      const res = await fetch("/api/admin/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create player");
        return;
      }

      // 2. Optionally assign a plan (create membership)
      if (form.planId) {
        await fetch("/api/admin/memberships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: data.player.id,
            planId: form.planId,
            startDate: new Date().toISOString().split("T")[0],
          }),
        });
      }

      setCreated({ name: data.player.name, email: data.player.email, tempPassword: data.tempPassword });
    } finally {
      setLoading(false);
    }
  }

  async function copyPassword() {
    if (!created) return;
    await navigator.clipboard.writeText(created.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (created) {
    return (
      <div className="max-w-md space-y-6">
        <Link href="/admin/players" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Back to players
        </Link>
        <Card>
          <CardHeader>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-2">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Player created!</h2>
            <p className="text-sm text-gray-500">Share these login credentials with <strong>{created.name}</strong>.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="font-medium text-gray-900">{created.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Temp password</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-gray-900">{created.tempPassword}</span>
                  <button onClick={copyPassword} className="p-1 rounded hover:bg-gray-200 transition-colors">
                    {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                  </button>
                </div>
              </div>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Save this password now — it cannot be shown again. The player should change it after first login.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => { setCreated(null); setForm({ name: "", email: "", phone: "", planId: "" }); }}
              >
                Add another
              </Button>
              <Button type="button" className="flex-1" onClick={() => router.push("/admin/players")}>
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
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
          <h1 className="text-2xl font-bold text-gray-900">Add Player</h1>
          <p className="text-gray-500 text-sm">A temporary password will be generated automatically.</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}

            <Input
              id="name"
              label="Full name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
            <Input
              id="email"
              label="Email address"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
            />
            <Input
              id="phone"
              label="Phone number (optional)"
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+1 (555) 000-0000"
            />

            {/* Plan select */}
            <div className="flex flex-col gap-1">
              <label htmlFor="planId" className="text-sm font-medium text-gray-700">
                Assign plan <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                id="planId"
                value={form.planId}
                onChange={(e) => set("planId", e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">— No plan —</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.duration} days · {p.currency} {Number(p.price).toFixed(2)}
                  </option>
                ))}
              </select>
              {plans.length === 0 && (
                <p className="text-xs text-gray-400">No active plans found. Create a plan first.</p>
              )}
            </div>

            <Button type="submit" className="w-full" loading={loading}>Create player</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
