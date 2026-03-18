"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Building2, ImageIcon } from "lucide-react";

interface ClubSettingsFormProps {
  initialName: string;
  initialLogoUrl?: string | null;
}

export function ClubSettingsForm({ initialName, initialLogoUrl }: ClubSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl ?? "");
  const [logoError, setLogoError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const previewUrl = logoUrl.trim() || null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    const body: Record<string, unknown> = { name };
    if (logoUrl.trim()) body.logoUrl = logoUrl.trim();
    else body.logoUrl = null; // allow clearing the logo

    try {
      const res = await fetch("/api/admin/club", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to update" });
      } else {
        setMessage({ type: "success", text: "Club details updated!" });
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
      <CardHeader>
        <h2 className="text-base font-semibold text-gray-900">Club Details</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5 max-w-sm">
          {message && (
            <div className={`p-3 rounded-lg text-sm border ${
              message.type === "success"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              {message.text}
            </div>
          )}

          <Input
            id="name"
            label="Club name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          {/* Logo URL field */}
          <div className="space-y-2">
            <Input
              id="logoUrl"
              label="Club logo URL (optional)"
              type="url"
              value={logoUrl}
              onChange={(e) => {
                setLogoUrl(e.target.value);
                setLogoError(false);
              }}
              placeholder="https://example.com/logo.png"
            />

            {/* Live preview */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
              {previewUrl && !logoError ? (
                <img
                  src={previewUrl}
                  alt="Club logo preview"
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                  {logoError ? (
                    <ImageIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Building2 className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">{name || "Club name"}</p>
                <p className="text-xs text-gray-400">
                  {logoError
                    ? "Could not load image — check the URL"
                    : previewUrl
                    ? "Logo preview"
                    : "No logo set"}
                </p>
              </div>
            </div>
          </div>

          <Button type="submit" loading={loading}>Save changes</Button>
        </form>
      </CardContent>
    </Card>
  );
}
