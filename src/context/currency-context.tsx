"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  type CurrencyCode,
  CURRENCIES,
  formatCurrency,
  convertCurrency,
} from "@/lib/currency";

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  format: (amount: number | string | { toString(): string }, baseCurrency?: CurrencyCode) => string;
  convert: (amount: number, from?: CurrencyCode) => number;
  currencies: typeof CURRENCIES;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({
  children,
  initialCurrency = "CAD",
}: {
  children: ReactNode;
  initialCurrency?: CurrencyCode;
}) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(initialCurrency);

  function setCurrency(c: CurrencyCode) {
    setCurrencyState(c);
    localStorage.setItem("clubsy_currency", c);
    fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency: c }),
    }).catch(() => {});
  }

  function format(
    amount: number | string | { toString(): string },
    baseCurrency: CurrencyCode = "CAD"
  ) {
    const num =
      typeof amount === "object" ? Number(amount.toString()) : Number(amount);
    const converted = convertCurrency(num, baseCurrency, currency);
    return formatCurrency(converted, currency);
  }

  function convert(amount: number, from: CurrencyCode = "CAD") {
    return convertCurrency(amount, from, currency);
  }

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, format, convert, currencies: CURRENCIES }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
