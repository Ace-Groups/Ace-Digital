import type { AccessContext } from "./types";
import { isOrgWideRole, isRole, roleRank } from "./roles";

export const PERMISSIONS = [
  "dashboard:view",
  "projects:read",
  "projects:write",
  "projects:delete",
  "projects:budget",
  "tasks:read",
  "tasks:write",
  "tasks:delete",
  "employees:read",
  "employees:read_self",
  "employees:write",
  "employees:password_reset",
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
  "service_tickets:read",
  "service_tickets:write",
  "service_tickets:assign",
  "approvals:submit",
  "approvals:review",
  "reports:read",
  "reports:write",
  "channels:read",
  "channels:post",
  "channels:write",
  "channels:all",
  "notes:read",
  "notes:write",
  "activity:read",
  "activity:read_org",
  "calendar:read",
  "calendar:write",
  "calendar:write_others",
  "calendar:read_team",
  "calendar:read_org",
  "teams:read",
  "teams:write",
  "teams:delete",
  "users:register",
  "credentials:read",
  "credentials:manage",
  "credentials:sign_self",
  "certificates:issue",
  "certificates:read_self",
  "verify:manage_kiosk",
  "verify:edit_public_card",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  super_admin: PERMISSIONS,
  management: [
    "credentials:read",
    "credentials:sign_self",
    "verify:manage_kiosk",
    "verify:edit_public_card",
    "dashboard:view",
    "projects:read",
    "projects:write",
    "teams:read",
    "teams:write",
    "teams:delete",
    "projects:delete",
    "tasks:read",
    "tasks:write",
    "tasks:delete",
    "employees:read",
    "employees:write",
    "employees:password_reset",
    "employees:delete",
    "finance:summary",
    "finance:salaries_all",
    "finance:expenses_read",
    "finance:expenses_write",
    "finance:payroll",
    "clients:read",
    "clients:write",
    "clients:delete",
    "service_tickets:read",
    "service_tickets:write",
    "service_tickets:assign",
    "approvals:submit",
    "approvals:review",
    "reports:read",
    "reports:write",
    "channels:read",
    "channels:post",
    "channels:write",
    "channels:all",
    "notes:read",
    "notes:write",
    "activity:read",
    "activity:read_org",
    "calendar:read",
    "calendar:write",
    "calendar:write_others",
    "calendar:read_team",
    "calendar:read_org",
  ],
  finance: [
    "credentials:sign_self",
    "verify:edit_public_card",
    "dashboard:view",
    "projects:read",
    "projects:budget",
    "teams:read",
    "tasks:read",
    "employees:read",
    "employees:write",
    "employees:password_reset",
    "finance:summary",
    "finance:salaries_all",
    "finance:expenses_read",
    "finance:expenses_write",
    "finance:expenses_approve",
    "finance:payroll",
    "clients:read",
    "service_tickets:read",
    "approvals:submit",
    "approvals:review",
    "reports:read",
    "reports:write",
    "channels:read",
    "channels:post",
    "channels:write",
    "notes:read",
    "notes:write",
    "activity:read",
    "activity:read_org",
    "calendar:read",
    "calendar:write",
  ],
  hr: [
    "credentials:read",
    "credentials:manage",
    "credentials:sign_self",
    "certificates:issue",
    "verify:edit_public_card",
    "dashboard:view",
    "projects:read",
    "teams:read",
    "teams:write",
    "tasks:read",
    "employees:read",
    "employees:write",
    "employees:password_reset",
    "clients:read",
    "service_tickets:read",
    "approvals:submit",
    "approvals:review",
    "reports:read",
    "channels:read",
    "channels:post",
    "channels:write",
    "notes:read",
    "notes:write",
    "activity:read",
    "activity:read_org",
    "calendar:read",
    "calendar:write",
    "calendar:write_others",
    "calendar:read_team",
    "calendar:read_org",
  ],
  client_manager: [
    "dashboard:view",
    "projects:read",
    "teams:read",
    "clients:read",
    "clients:write",
    "clients:delete",
    "service_tickets:read",
    "service_tickets:write",
    "service_tickets:assign",
    "approvals:submit",
    "reports:read",
    "channels:read",
    "channels:post",
    "channels:write",
    "notes:read",
    "notes:write",
    "activity:read",
    "calendar:read",
    "calendar:write",
  ],
  team_lead: [
    "dashboard:view",
    "projects:read",
    "teams:read",
    "projects:write",
    "tasks:read",
    "tasks:write",
    "tasks:delete",
    "service_tickets:read",
    "service_tickets:write",
    "service_tickets:assign",
    "approvals:submit",
    "approvals:review",
    "reports:read",
    "channels:read",
    "channels:post",
    "channels:write",
    "notes:read",
    "notes:write",
    "activity:read",
    "calendar:read",
    "calendar:write",
    "calendar:write_others",
    "calendar:read_team",
  ],
  employee: [
    "certificates:read_self",
    "verify:edit_public_card",
    "dashboard:view",
    "teams:read",
    "tasks:read",
    "tasks:write",
    "service_tickets:read",
    "service_tickets:write",
    "employees:read_self",
    "finance:salaries_self",
    "approvals:submit",
    "channels:read",
    "channels:post",
    "channels:write",
    "notes:read",
    "notes:write",
    "activity:read",
    "calendar:read",
    "calendar:write",
  ],
};

/** List coworkers when creating channels or similar collaboration flows. */
export function canBrowseEmployeeDirectory(ctx: AccessContext): boolean {
  return hasPermission(ctx, "employees:read") || hasPermission(ctx, "channels:write");
}

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

export function canViewProjectBudget(ctx: AccessContext): boolean {
  return hasPermission(ctx, "projects:budget");
}

export function stripProjectBudget<T extends { budget?: unknown }>(row: T): T {
  return { ...row, budget: null };
}

export function stripSalaryFields<T extends Record<string, unknown>>(row: T): T {
  const { baseSalary, bonus, payrollStatus, salaryMode, ...rest } = row;
  void baseSalary;
  void bonus;
  void payrollStatus;
  void salaryMode;
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

export function taskAssigneeIds(task: {
  assigneeId: number | null;
  assigneeIds?: number[] | null;
}): number[] {
  const ids = task.assigneeIds;
  if (Array.isArray(ids) && ids.length > 0) return ids;
  if (task.assigneeId != null) return [task.assigneeId];
  return [];
}

/** Edit title, assignees, project, etc. — task creator or org-wide admin. */
export function canEditTask(
  ctx: AccessContext,
  task: { createdById: number | null; assigneeId: number | null; teamId: number | null },
): boolean {
  if (!hasPermission(ctx, "tasks:write")) return false;
  if (isOrgWideRole(ctx.role)) return true;
  return task.createdById === ctx.userId;
}

export function canDeleteTask(
  ctx: AccessContext,
  task: { createdById: number | null; assigneeId: number | null; teamId: number | null },
): boolean {
  if (!hasPermission(ctx, "tasks:delete")) return false;
  if (isOrgWideRole(ctx.role)) return true;
  return task.createdById === ctx.userId;
}

/** Mark own slice complete — assignees only; common tasks: creator only. */
export function canToggleTaskCompletion(
  ctx: AccessContext,
  task: {
    createdById: number | null;
    assigneeId: number | null;
    assigneeIds?: number[] | null;
  },
): boolean {
  if (!hasPermission(ctx, "tasks:write")) return false;
  const ids = taskAssigneeIds(task);
  if (ids.length === 0) return task.createdById === ctx.userId;
  return ids.includes(ctx.userId);
}

/** @deprecated Use canEditTask / canToggleTaskCompletion */
export function canMutateTask(
  ctx: AccessContext,
  task: {
    createdById?: number | null;
    assigneeId: number | null;
    teamId: number | null;
    assigneeIds?: number[] | null;
  },
): boolean {
  return canEditTask(ctx, {
    createdById: task.createdById ?? null,
    assigneeId: task.assigneeId,
    teamId: task.teamId,
  });
}
