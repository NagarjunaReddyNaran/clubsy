"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { X } from "lucide-react";

const FILTER_KEYS = ["q", "from", "to", "plan", "status"];

export function ClearFiltersButton() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeFilters = FILTER_KEYS.filter((k) => searchParams.has(k));
  if (activeFilters.length === 0) return null;

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach((k) => params.delete(k));
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <button
      onClick={clearAll}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors whitespace-nowrap"
    >
      <X className="w-3.5 h-3.5" />
      Clear filters
      <span className="bg-red-200 text-red-700 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none">
        {activeFilters.length}
      </span>
    </button>
  );
}
