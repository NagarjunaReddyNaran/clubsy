import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function getDaysRemaining(endDate: Date | string): number {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getMembershipStatusColor(
  status: string
): "success" | "warning" | "danger" | "info" | "default" {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "EXPIRED":
      return "danger";
    case "PENDING":
      return "warning";
    case "CANCELLED":
      return "default";
    default:
      return "default";
  }
}
