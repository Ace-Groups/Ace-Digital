import { canAccessOrgData, hasPermission, type AccessContext } from "@workspace/rbac";
import type { ServiceTicket } from "../schema";

export function canSeeServiceTicket(ctx: AccessContext, ticket: ServiceTicket): boolean {
  if (!hasPermission(ctx, "service_tickets:read")) return false;
  if (canAccessOrgData(ctx) || ctx.role === "client_manager") return true;
  if (ctx.role === "team_lead") {
    if (ticket.teamId != null && ticket.teamId === ctx.teamId) return true;
    if (ticket.assigneeId === ctx.userId || ticket.createdById === ctx.userId) return true;
    return false;
  }
  if (ctx.role === "employee") {
    return ticket.assigneeId === ctx.userId || ticket.createdById === ctx.userId;
  }
  if (ctx.role === "finance" || ctx.role === "hr") return true;
  return false;
}

export function canWriteServiceTicket(ctx: AccessContext, ticket: ServiceTicket): boolean {
  if (!hasPermission(ctx, "service_tickets:write")) return false;
  if (canAccessOrgData(ctx) || ctx.role === "client_manager") return true;
  if (ctx.role === "team_lead") {
    if (ticket.teamId != null && ticket.teamId === ctx.teamId) return true;
    if (ticket.assigneeId === ctx.userId || ticket.createdById === ctx.userId) return true;
    return false;
  }
  if (ctx.role === "employee") {
    return ticket.assigneeId === ctx.userId || ticket.createdById === ctx.userId;
  }
  return false;
}

export function scopeServiceTicketList(ctx: AccessContext, tickets: ServiceTicket[]): ServiceTicket[] {
  return tickets.filter((t) => canSeeServiceTicket(ctx, t));
}

export function isTicketFollowUpOverdue(ticket: ServiceTicket, now = Date.now()): boolean {
  if (!ticket.nextFollowUpAt) return false;
  if (ticket.status === "CLOSED" || ticket.status === "RESOLVED") return false;
  return ticket.nextFollowUpAt.getTime() < now;
}
