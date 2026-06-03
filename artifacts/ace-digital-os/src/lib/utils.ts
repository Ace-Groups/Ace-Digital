import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** Parse `YYYY-MM-DD` as local calendar date (no timezone shift). */
export function parseDateInput(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }
  return date;
}

/** Format date as `YYYY-MM-DD` for API / form state. */
export function toDateInputValue(date: Date | undefined | null): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDateLabel(
  value: string | undefined | null,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  },
): string {
  const date = parseDateInput(value) ?? (value ? new Date(value) : undefined);
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", options);
}

/** Parse `YYYY-MM-DDTHH:mm` (datetime-local) or ISO strings as local time. */
export function parseDateTimeInput(value: string | undefined | null): Date | undefined {
  if (!value?.trim()) return undefined;
  const trimmed = value.trim();
  const localMatch = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(trimmed);
  if (localMatch) {
    const date = new Date(
      Number(localMatch[1]),
      Number(localMatch[2]) - 1,
      Number(localMatch[3]),
      Number(localMatch[4]),
      Number(localMatch[5]),
    );
    if (!Number.isNaN(date.getTime())) return date;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

/** Format for form state / datetime-local compatible values. */
export function toDateTimeInputValue(date: Date | undefined | null): string {
  if (!date || Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function formatDateTimeLabel(value: string | undefined | null): string {
  const date = parseDateTimeInput(value);
  if (!date) return "";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export type TimeParts = { hour12: number; minute: number; meridiem: "AM" | "PM" };

export function getTimeParts(date: Date): TimeParts {
  const h24 = date.getHours();
  const meridiem: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour12, minute: date.getMinutes(), meridiem };
}

export function applyTimeParts(
  base: Date,
  hour12: number,
  minute: number,
  meridiem: "AM" | "PM",
): Date {
  const next = new Date(base);
  let h24 = hour12 % 12;
  if (meridiem === "PM") h24 += 12;
  if (hour12 === 12 && meridiem === "AM") h24 = 0;
  next.setHours(h24, minute, 0, 0);
  return next;
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
    case "URGENT":
      return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30";
    case "HIGH":
      return "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30";
    case "MEDIUM":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "LOW":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function statusColor(status: string): string {
  switch (status?.toUpperCase()) {
    case "DONE":
    case "APPROVED":
    case "ACTIVE":
    case "PAID":
    case "RESOLVED":
    case "CLOSED":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    case "OPEN":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "WAITING_CLIENT":
      return "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30";
    case "IN_PROGRESS":
    case "PROSPECT":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30";
    case "REVIEW":
      return "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30";
    case "PENDING":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "REJECTED":
      return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30";
    case "TODO":
    case "INACTIVE":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}
