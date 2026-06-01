import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Primary action button — use instead of hardcoded brand hex classes */
export const btnPrimary =
  "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function priorityColor(priority: string): string {
  switch (priority?.toUpperCase()) {
    case "URGENT": return "bg-red-100 text-red-700 border-red-200";
    case "HIGH": return "bg-orange-100 text-orange-700 border-orange-200";
    case "MEDIUM": return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "LOW": return "bg-gray-100 text-gray-600 border-gray-200";
    default: return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

export function statusColor(status: string): string {
  switch (status?.toUpperCase()) {
    case "DONE": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "IN_PROGRESS": return "bg-blue-100 text-blue-700 border-blue-200";
    case "REVIEW": return "bg-purple-100 text-purple-700 border-purple-200";
    case "TODO": return "bg-gray-100 text-gray-600 border-gray-200";
    case "PENDING": return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "APPROVED": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "REJECTED": return "bg-red-100 text-red-700 border-red-200";
    case "ACTIVE": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "INACTIVE": return "bg-gray-100 text-gray-600 border-gray-200";
    case "PROSPECT": return "bg-blue-100 text-blue-700 border-blue-200";
    case "PAID": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    default: return "bg-gray-100 text-gray-600 border-gray-200";
  }
}
