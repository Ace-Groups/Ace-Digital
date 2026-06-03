import type { CalendarEvent } from "../schema/calendar";

export function calendarEventInRange(
  event: CalendarEvent,
  from: Date,
  to: Date,
): boolean {
  const start = event.startAt.getTime();
  const end = (event.endAt ?? event.startAt).getTime();
  return start <= to.getTime() && end >= from.getTime();
}
