import type { AccessContext } from "./types";
import { canAccessOrgData, hasPermission, isSameTeam } from "./permissions";
import { isOrgWideRole } from "./roles";

export type CalendarEventLike = {
  ownerId: number;
  createdById: number;
  attendeeIds?: number[] | null;
  teamId?: number | null;
  visibility?: string | null;
};

export function canViewUserCalendar(ctx: AccessContext, targetUserId: number): boolean {
  if (!hasPermission(ctx, "calendar:read")) return false;
  if (ctx.userId === targetUserId) return true;
  if (hasPermission(ctx, "calendar:read_org") && isOrgWideRole(ctx.role)) return true;
  if (hasPermission(ctx, "calendar:read_team") && ctx.role === "team_lead") {
    return true;
  }
  return false;
}

export function canViewCalendarEvent(
  ctx: AccessContext,
  event: CalendarEventLike,
  targetUserId: number,
): boolean {
  if (!hasPermission(ctx, "calendar:read")) return false;

  const attendees = event.attendeeIds ?? [];
  const isAttendee = attendees.includes(targetUserId);
  const isOwner = event.ownerId === targetUserId;

  if (ctx.userId === targetUserId || isOwner || isAttendee) {
    if (ctx.userId === targetUserId) return true;
    if (canViewUserCalendar(ctx, targetUserId)) return true;
  }

  if (event.visibility === "org" && canAccessOrgData(ctx)) return true;
  if (
    event.visibility === "team" &&
    event.teamId != null &&
    isSameTeam(ctx, event.teamId) &&
    (ctx.userId === targetUserId || canViewUserCalendar(ctx, targetUserId))
  ) {
    return true;
  }

  if (attendees.includes(ctx.userId)) return true;
  if (event.ownerId === ctx.userId) return true;
  if (event.createdById === ctx.userId) return true;

  return canViewUserCalendar(ctx, targetUserId) && (isOwner || isAttendee);
}

export function canCreateCalendarEvent(
  ctx: AccessContext,
  input: { ownerId: number; attendeeIds: number[]; teamId?: number | null },
): boolean {
  if (!hasPermission(ctx, "calendar:write")) return false;
  if (input.ownerId === ctx.userId) return true;
  if (!hasPermission(ctx, "calendar:write_others")) return false;
  if (isOrgWideRole(ctx.role) || ctx.role === "management" || ctx.role === "hr") return true;
  if (ctx.role === "team_lead" && input.teamId != null && isSameTeam(ctx, input.teamId)) {
    return true;
  }
  if (ctx.role === "team_lead") {
    return input.ownerId !== ctx.userId && input.teamId === ctx.teamId;
  }
  return false;
}

export function canEditCalendarEvent(ctx: AccessContext, event: CalendarEventLike): boolean {
  if (!hasPermission(ctx, "calendar:write")) return false;
  if (isOrgWideRole(ctx.role)) return true;
  if (event.createdById === ctx.userId) return true;
  if (event.ownerId === ctx.userId && event.createdById === ctx.userId) return true;
  return false;
}

export function canDeleteCalendarEvent(ctx: AccessContext, event: CalendarEventLike): boolean {
  return canEditCalendarEvent(ctx, event);
}
