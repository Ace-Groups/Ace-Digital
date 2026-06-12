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
  if (ctx.role === "employee") return [];
  if (canAccessOrgData(ctx) || ctx.role === "client_manager") return projects;
  if (ctx.role === "team_lead") {
    if (ctx.teamId == null) return [];
    return projects.filter((p) => p.teamId === ctx.teamId);
  }
  return projects;
}

function taskAssigneeIds(task: Task): number[] {
  const fromJson = task.assigneeIds;
  if (Array.isArray(fromJson) && fromJson.length > 0) return fromJson;
  if (task.assigneeId != null) return [task.assigneeId];
  return [];
}

/** Creator, any assignee, or org-wide admin (super_admin / management). */
export function canSeeTask(ctx: AccessContext, task: Task): boolean {
  if (canAccessOrgData(ctx)) return true;
  if (task.createdById === ctx.userId) return true;
  return taskAssigneeIds(task).includes(ctx.userId);
}

export function scopeTaskList(ctx: AccessContext, tasks: Task[]): Task[] {
  if (canAccessOrgData(ctx)) return tasks;
  return tasks.filter((t) => canSeeTask(ctx, t));
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
