"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CURRENCIES, type CurrencyCode } from "@/lib/currency";
import { useCurrency } from "@/context/currency-context";

interface ProfileData {
  name: string | null;
  email: string;
  phone: string | null;
  currency: string;
}

export function ProfileForm({ initialData }: { initialData: ProfileData }) {
  const router = useRouter();
  const { setCurrency } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: initialData.name ?? "",
    phone: initialData.phone ?? "",
    currency: initialData.currency,
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name || undefined,
          phone: formData.phone || null,
          currency: formData.currency,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Failed to save profile" });
      } else {
        setCurrency(data.currency as CurrencyCode);
        setMessage({ type: "success", text: "Profile saved successfully" });
        router.refresh();
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {message && (
            <div
              className={`p-3 rounded-lg text-sm border ${
                message.type === "success"
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}

          <Input
            id="name"
            name="name"
            label="Name"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <Input
            id="email"
            name="email"
            label="Email"
            type="email"
            value={initialData.email}
            readOnly
            disabled
          />

          <Input
            id="phone"
            name="phone"
            label="Phone (optional)"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+1 234 567 8900"
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="currency" className="text-sm font-medium text-gray-700">
              Currency
            </label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.values(CURRENCIES).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" loading={loading}>
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
