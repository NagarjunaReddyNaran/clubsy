// Supported currencies
export const CURRENCIES = {
  CAD: { code: "CAD", symbol: "CA$", name: "Canadian Dollar", locale: "en-CA" },
  USD: { code: "USD", symbol: "US$", name: "US Dollar", locale: "en-US" },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "en-IN" },
  EUR: { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE" },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

// Mock exchange rates (base: CAD)
// In production, replace with a live API like Open Exchange Rates
export const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  CAD: 1.0,
  USD: 0.73,
  INR: 60.8,
  EUR: 0.68,
  GBP: 0.58,
};

export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): number {
  if (fromCurrency === toCurrency) return amount;
  // Convert to CAD first, then to target
  const inCAD = amount / EXCHANGE_RATES[fromCurrency];
  return inCAD * EXCHANGE_RATES[toCurrency];
}

export function formatCurrency(
  amount: number | string | { toString(): string },
  currencyCode: CurrencyCode = "CAD"
): string {
  const num =
    typeof amount === "object" ? Number(amount.toString()) : Number(amount);
  const currency = CURRENCIES[currencyCode] ?? CURRENCIES.CAD;

  return new Intl.NumberFormat(currency.locale, {
    style: "currency",
    currency: currency.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function getDefaultCurrency(): CurrencyCode {
  return "CAD";
}
