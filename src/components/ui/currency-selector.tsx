"use client";

import { useCurrency } from "@/context/currency-context";
import { CURRENCIES, type CurrencyCode } from "@/lib/currency";

export function CurrencySelector({ className }: { className?: string }) {
  const { currency, setCurrency } = useCurrency();

  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
      className={`text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${className}`}
      aria-label="Select currency"
    >
      {Object.values(CURRENCIES).map((c) => (
        <option key={c.code} value={c.code}>
          {c.symbol} {c.code}
        </option>
      ))}
    </select>
  );
}
