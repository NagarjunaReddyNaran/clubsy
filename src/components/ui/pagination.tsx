"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  total: number;
  pageSize: number;
  currentPage: number;
}

function pageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

export function Pagination({ total, pageSize, currentPage }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) return null;

  function goTo(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const btnBase = "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors";

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
      <p className="text-sm text-gray-500 order-2 sm:order-1">
        {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, total)} of{" "}
        <span className="font-medium text-gray-700">{total}</span>
      </p>

      <div className="flex items-center gap-1 order-1 sm:order-2">
        <button
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage <= 1}
          className={cn(btnBase, "text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed")}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pageRange(currentPage, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="w-8 text-center text-gray-400 text-sm">…</span>
          ) : (
            <button
              key={p}
              onClick={() => goTo(p)}
              className={cn(
                btnBase,
                p === currentPage
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={cn(btnBase, "text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed")}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
