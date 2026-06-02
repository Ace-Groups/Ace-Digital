import {
  canAccessOrgData,
  canApproveApprovalType,
  dashboardShowsWidget,
  filterApprovalsForList,
  type AccessContext,
} from "@workspace/rbac";
import type { Approval, Project, Task } from "../schema";

export type { AccessContext };

export function scopeProjectList(ctx: AccessContext, projects: Project[]): Project[] {
  if (canAccessOrgData(ctx) || ctx.role === "client_manager") return projects;
  if (ctx.role === "team_lead" || ctx.role === "employee") {
    if (ctx.teamId == null) return [];
    return projects.filter((p) => p.teamId === ctx.teamId);
  }
  return projects;
}

export function scopeTaskList(ctx: AccessContext, tasks: Task[]): Task[] {
  if (canAccessOrgData(ctx) || ctx.role === "management") return tasks;
  if (ctx.role === "finance" || ctx.role === "hr" || ctx.role === "client_manager") return tasks;
  if (ctx.role === "team_lead") {
    if (ctx.teamId == null) return [];
    return tasks.filter((t) => t.teamId === ctx.teamId);
  }
  if (ctx.role === "employee") {
    return tasks.filter(
      (t) => t.assigneeId === ctx.userId || (ctx.teamId != null && t.teamId === ctx.teamId),
    );
  }
  return tasks;
}

export function filterApprovalsScoped(ctx: AccessContext, approvals: Approval[]): Approval[] {
  return approvals.filter((a) =>
    filterApprovalsForList(ctx, [
      {
        type: a.type,
        requestedById: a.requestedById,
        teamId: a.teamId,
        status: a.status,
      },
    ]).length > 0,
  );
}

export function countPendingApprovalsForContext(ctx: AccessContext, approvals: Approval[]): number {
  return approvals.filter(
    (a) => a.status === "PENDING" && canApproveApprovalType(ctx, a.type),
  ).length;
}

export function scopeActivityTeamIds(ctx: AccessContext): number[] | null {
  if (canAccessOrgData(ctx)) return null;
  if (ctx.teamId != null) return [ctx.teamId];
  return [];
}

export { dashboardShowsWidget };
