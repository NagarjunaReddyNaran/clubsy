"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "Today", days: 0 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "All time", days: -1 },
] as const;

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

interface DateFilterProps {
  from?: string;
  to?: string;
}

export function DateFilter({ from, to }: DateFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function applyPreset(days: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (days === -1) {
      params.delete("from");
      params.delete("to");
    } else if (days === 0) {
      const today = toDateStr(new Date());
      params.set("from", today);
      params.set("to", today);
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      params.set("from", toDateStr(start));
      params.set("to", toDateStr(end));
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function applyCustom(field: "from" | "to", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(field, value);
    else params.delete(field);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function activePreset(): number | null {
    if (!from && !to) return -1;
    const today = toDateStr(new Date());
    if (from === today && to === today) return 0;
    if (to === today && from) {
      const diff = Math.round((new Date().getTime() - new Date(from).getTime()) / 86400000);
      if (diff === 7) return 7;
      if (diff === 30) return 30;
    }
    return null;
  }

  const active = activePreset();

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
      {/* Quick presets */}
      <div className="flex gap-1 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p.days}
            onClick={() => applyPreset(p.days)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap",
              active === p.days
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom range */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={from ?? ""}
          onChange={(e) => applyCustom("from", e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <span className="text-xs text-gray-400">to</span>
        <input
          type="date"
          value={to ?? ""}
          onChange={(e) => applyCustom("to", e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>
    </div>
  );
}
