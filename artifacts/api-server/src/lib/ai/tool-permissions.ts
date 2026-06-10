import type { AccessContext } from "@workspace/rbac";
import { hasPermission, hasAnyPermission, type Permission } from "@workspace/rbac";
import type { ToolExecutionResult } from "./types";

export type ToolPermissionDef = {
  requiredPermissions: Permission[];
  anyOf?: boolean;
};

export const TOOL_PERMISSIONS: Record<string, ToolPermissionDef> = {
  query_pending_tasks: { requiredPermissions: ["tasks:read"] },
  summarize_client_tickets: { requiredPermissions: ["service_tickets:read"] },
  check_project_budgets_and_expenses: {
    requiredPermissions: ["finance:summary", "finance:expenses_read"],
    anyOf: true,
  },
  list_projects: { requiredPermissions: ["projects:read"] },
  list_tasks: { requiredPermissions: ["tasks:read"] },
  get_dashboard_snapshot: { requiredPermissions: ["dashboard:view"] },
  list_clients: { requiredPermissions: ["clients:read"] },
  list_service_tickets: { requiredPermissions: ["service_tickets:read"] },
  list_calendar_events: { requiredPermissions: ["calendar:read"] },
  search_notes: { requiredPermissions: ["notes:read"] },
  get_note: { requiredPermissions: ["notes:read"] },
  list_approvals: {
    requiredPermissions: ["approvals:review", "approvals:submit"],
    anyOf: true,
  },
  list_activity: { requiredPermissions: ["activity:read"] },
  generate_report_data: { requiredPermissions: ["reports:read"] },
  create_task: { requiredPermissions: ["tasks:write"] },
  update_task_status: { requiredPermissions: ["tasks:write"] },
  create_calendar_event: { requiredPermissions: ["calendar:write"] },
  post_channel_message: { requiredPermissions: ["channels:post"] },
  submit_approval: { requiredPermissions: ["approvals:submit"] },
  list_teams: { requiredPermissions: ["teams:read"] },
  lookup_employee: { requiredPermissions: ["employees:read"] },
  create_employee: { requiredPermissions: ["employees:write"] },
  create_channel: { requiredPermissions: ["channels:write"] },
  create_project: { requiredPermissions: ["projects:write"] },
  create_client: { requiredPermissions: ["clients:write"] },
  create_service_ticket: { requiredPermissions: ["service_tickets:write"] },
  create_note: { requiredPermissions: ["notes:write"] },
};

function checkPerms(
  ctx: AccessContext,
  perms: Permission[],
  anyOf = false,
): ToolExecutionResult | null {
  const allowed = anyOf
    ? hasAnyPermission(ctx, perms)
    : perms.every((p) => hasPermission(ctx, p));
  if (!allowed) {
    return { ok: false, permissionDenied: true, requiredPermissions: perms };
  }
  return null;
}

export function getToolRequiredPermissions(name: string): Permission[] {
  return TOOL_PERMISSIONS[name]?.requiredPermissions ?? [];
}

export function checkToolPermission(
  ctx: AccessContext,
  name: string,
): ToolExecutionResult | null {
  const meta = TOOL_PERMISSIONS[name];
  if (!meta) {
    return { ok: false, permissionDenied: false, output: { error: `Unknown tool: ${name}` } };
  }
  return checkPerms(ctx, meta.requiredPermissions, meta.anyOf);
}
