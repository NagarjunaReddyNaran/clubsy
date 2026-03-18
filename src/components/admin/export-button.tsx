"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ExportButtonProps {
  endpoint: string;
  filename?: string;
  label?: string;
  params?: Record<string, string>;
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function ExportButton({
  endpoint,
  label = "Export CSV",
  params,
  variant = "outline",
  size = "sm",
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const url = new URL(endpoint, window.location.origin);
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v) url.searchParams.set(k, v);
        });
      }

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "export.csv";

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("Export error:", err);
      alert("Export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant={variant} size={size} loading={loading} onClick={handleExport}>
      <Download className="w-4 h-4" />
      {label}
    </Button>
  );
}
