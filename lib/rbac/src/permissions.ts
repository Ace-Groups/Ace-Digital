import type { AccessContext } from "./types";
import { isOrgWideRole, isRole, roleRank } from "./roles";

export const PERMISSIONS = [
  "dashboard:view",
  "projects:read",
  "projects:write",
  "projects:delete",
  "tasks:read",
  "tasks:write",
  "tasks:delete",
  "employees:read",
  "employees:read_self",
  "employees:write",
  "employees:delete",
  "finance:summary",
  "finance:salaries_all",
  "finance:salaries_self",
  "finance:expenses_read",
  "finance:expenses_write",
  "finance:expenses_approve",
  "finance:payroll",
  "clients:read",
  "clients:write",
  "clients:delete",
  "approvals:submit",
  "approvals:review",
  "reports:read",
  "reports:write",
  "channels:read",
  "channels:post",
  "channels:write",
  "channels:all",
  "activity:read",
  "activity:read_org",
  "users:register",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  super_admin: PERMISSIONS,
  management: [
    "dashboard:view",
    "projects:read",
    "projects:write",
    "projects:delete",
    "tasks:read",
    "tasks:write",
    "tasks:delete",
    "employees:read",
    "employees:write",
    "employees:delete",
    "finance:summary",
    "finance:expenses_read",
    "clients:read",
    "clients:write",
    "clients:delete",
    "approvals:submit",
    "approvals:review",
    "reports:read",
    "reports:write",
    "channels:read",
    "channels:post",
    "channels:write",
    "channels:all",
    "activity:read",
    "activity:read_org",
  ],
  finance: [
    "dashboard:view",
    "projects:read",
    "tasks:read",
    "employees:read",
    "employees:write",
    "finance:summary",
    "finance:salaries_all",
    "finance:expenses_read",
    "finance:expenses_write",
    "finance:expenses_approve",
    "finance:payroll",
    "clients:read",
    "approvals:submit",
    "approvals:review",
    "reports:read",
    "reports:write",
    "channels:read",
    "channels:post",
    "activity:read",
    "activity:read_org",
  ],
  hr: [
    "dashboard:view",
    "projects:read",
    "tasks:read",
    "employees:read",
    "employees:write",
    "clients:read",
    "approvals:submit",
    "approvals:review",
    "reports:read",
    "channels:read",
    "channels:post",
    "activity:read",
    "activity:read_org",
  ],
  client_manager: [
    "dashboard:view",
    "projects:read",
    "clients:read",
    "clients:write",
    "clients:delete",
    "approvals:submit",
    "reports:read",
    "channels:read",
    "channels:post",
    "channels:write",
    "activity:read",
  ],
  team_lead: [
    "dashboard:view",
    "projects:read",
    "projects:write",
    "tasks:read",
    "tasks:write",
    "tasks:delete",
    "approvals:submit",
    "approvals:review",
    "reports:read",
    "channels:read",
    "channels:post",
    "channels:write",
    "activity:read",
  ],
  employee: [
    "dashboard:view",
    "projects:read",
    "tasks:read",
    "tasks:write",
    "employees:read_self",
    "finance:salaries_self",
    "approvals:submit",
    "channels:read",
    "channels:post",
    "activity:read",
  ],
};

export function getPermissionsForRole(role: string): Permission[] {
  if (!isRole(role)) return [];
  const set = ROLE_PERMISSIONS[role] ?? [];
  return [...set];
}

export function hasPermission(ctx: AccessContext, permission: Permission): boolean {
  const perms = getPermissionsForRole(ctx.role);
  return perms.includes(permission);
}

export function hasAnyPermission(ctx: AccessContext, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(ctx, p));
}

export function canAssignRole(actorRole: string, targetRole: string): boolean {
  if (!isRole(actorRole) || !isRole(targetRole)) return false;
  if (targetRole === "super_admin") return actorRole === "super_admin";
  if (actorRole === "super_admin") return true;
  if (actorRole === "management" || actorRole === "hr") {
    return roleRank(targetRole) <= roleRank("team_lead");
  }
  if (actorRole === "finance") {
    return targetRole === "employee" || targetRole === "finance";
  }
  return false;
}

export function canViewEmployeeDirectory(ctx: AccessContext): boolean {
  return hasPermission(ctx, "employees:read");
}

export function canViewSalaries(ctx: AccessContext): boolean {
  return hasPermission(ctx, "finance:salaries_all");
}

export function stripSalaryFields<T extends Record<string, unknown>>(row: T): T {
  const { baseSalary, bonus, payrollStatus, ...rest } = row;
  void baseSalary;
  void bonus;
  void payrollStatus;
  return rest as T;
}

export function isSameTeam(ctx: AccessContext, teamId: number | null | undefined): boolean {
  if (ctx.teamId == null || teamId == null) return false;
  return ctx.teamId === teamId;
}

export function canAccessOrgData(ctx: AccessContext): boolean {
  return isOrgWideRole(ctx.role);
}

export function canWriteProject(ctx: AccessContext, projectTeamId: number | null): boolean {
  if (!hasPermission(ctx, "projects:write")) return false;
  if (isOrgWideRole(ctx.role) || ctx.role === "management") return true;
  if (ctx.role === "team_lead") return isSameTeam(ctx, projectTeamId);
  return false;
}

export function canMutateTask(
  ctx: AccessContext,
  task: { assigneeId: number | null; teamId: number | null },
): boolean {
  if (!hasPermission(ctx, "tasks:write")) return false;
  if (isOrgWideRole(ctx.role) || ctx.role === "management" || ctx.role === "team_lead") {
    if (ctx.role === "team_lead") return isSameTeam(ctx, task.teamId);
    return true;
  }
  if (ctx.role === "employee") return task.assigneeId === ctx.userId;
  return false;
}

export function canDeleteTask(
  ctx: AccessContext,
  task: { assigneeId: number | null; teamId: number | null },
): boolean {
  if (!hasPermission(ctx, "tasks:delete")) return false;
  if (ctx.role === "employee") return false;
  return canMutateTask(ctx, task);
}
