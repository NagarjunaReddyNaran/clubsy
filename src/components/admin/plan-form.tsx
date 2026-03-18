"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: string | number | { toString: () => string };
  maxSessions: number | null;
  features: string[];
  isActive: boolean;
}

interface PlanFormProps {
  plan?: Plan;
}

export function PlanForm({ plan }: PlanFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [features, setFeatures] = useState<string[]>(plan?.features || [""]);

  const [formData, setFormData] = useState({
    name: plan?.name || "",
    description: plan?.description || "",
    duration: plan?.duration?.toString() || "30",
    price: plan?.price != null ? String(plan.price) : "",
    maxSessions: plan?.maxSessions?.toString() || "",
    isActive: plan?.isActive ?? true,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  function addFeature() {
    setFeatures((prev) => [...prev, ""]);
  }

  function removeFeature(index: number) {
    setFeatures((prev) => prev.filter((_, i) => i !== index));
  }

  function updateFeature(index: number, value: string) {
    setFeatures((prev) => prev.map((f, i) => (i === index ? value : f)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body = {
        ...formData,
        duration: parseInt(formData.duration),
        price: parseFloat(formData.price),
        maxSessions: formData.maxSessions ? parseInt(formData.maxSessions) : null,
        features: features.filter((f) => f.trim() !== ""),
      };

      const url = plan ? `/api/admin/plans/${plan.id}` : "/api/admin/plans";
      const method = plan ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save plan");
      } else {
        router.push("/admin/plans");
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

          <Input
            id="name"
            name="name"
            label="Plan name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Monthly Plan"
            required
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief description of the plan"
              rows={2}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="price"
              name="price"
              label="Price (₹)"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={handleChange}
              placeholder="1500"
              required
            />
            <Input
              id="duration"
              name="duration"
              label="Duration (days)"
              type="number"
              min="1"
              value={formData.duration}
              onChange={handleChange}
              placeholder="30"
              required
            />
          </div>

          <Input
            id="maxSessions"
            name="maxSessions"
            label="Max Sessions (leave empty for unlimited)"
            type="number"
            min="1"
            value={formData.maxSessions}
            onChange={handleChange}
            placeholder="Unlimited"
          />

          {/* Features */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Features</label>
            <div className="space-y-2">
              {features.map((feature, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => updateFeature(i, e.target.value)}
                    placeholder={`Feature ${i + 1}`}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => removeFeature(i)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addFeature}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add feature
              </button>
            </div>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Active (visible to players)</span>
          </label>

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>
              {plan ? "Update Plan" : "Create Plan"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
