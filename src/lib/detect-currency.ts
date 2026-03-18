import type { CurrencyCode } from "@/lib/currency";

export function detectCurrencyFromLocale(locale: string): CurrencyCode {
  const lang = locale.toLowerCase().split(",")[0].trim();
  if (lang.startsWith("en-ca")) return "CAD";
  if (lang.startsWith("en-us")) return "USD";
  if (lang.startsWith("en-in") || lang.startsWith("hi")) return "INR";
  if (lang.startsWith("en-gb")) return "GBP";
  if (/^(de|fr|es|it|nl|pt)/.test(lang)) return "EUR";
  return "CAD";
}
