/** Shared calendar date logic — single source of truth for day classification. */

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function isPastDay(date: Date): boolean {
  return startOfDay(date).getTime() < startOfDay(new Date()).getTime();
}

export function isFutureDay(date: Date): boolean {
  return startOfDay(date).getTime() > startOfDay(new Date()).getTime();
}

export type DayKind = "past" | "today" | "future";

export function getDayKind(date: Date): DayKind {
  if (isToday(date)) return "today";
  if (isPastDay(date)) return "past";
  return "future";
}

/** Human-readable label for scheduled dates (past, today, or upcoming). */
export function formatScheduleLabel(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const absDiffMins = Math.abs(Math.floor(diffMs / 60000));
  const absDiffHours = Math.abs(Math.floor(diffMs / 3600000));
  const absDiffDays = Math.abs(Math.floor(diffMs / 86400000));

  if (isSameDay(date, now)) {
    const time = date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
    if (diffMs > 0) {
      if (absDiffMins < 60) return `Today · in ${absDiffMins}m (${time})`;
      return `Today · ${time}`;
    }
    if (absDiffMins < 1) return `Today · just now`;
    if (absDiffMins < 60) return `Today · ${absDiffMins}m ago`;
    return `Today · ${time}`;
  }

  if (diffMs > 0) {
    if (absDiffDays === 1) {
      return `Tomorrow · ${date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`;
    }
    if (absDiffDays < 7) {
      return `${date.toLocaleDateString("en-IN", { weekday: "short" })} · ${date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`;
    }
    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (absDiffDays === 1) return "Yesterday";
  if (absDiffDays < 7) return `${absDiffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function calendarDayModifiers(date: Date): Record<string, boolean> {
  const kind = getDayKind(date);
  return {
    past: kind === "past",
    today: kind === "today",
    future: kind === "future",
  };
}
