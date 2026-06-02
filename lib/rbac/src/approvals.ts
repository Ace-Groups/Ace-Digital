import type { AccessContext, ApprovalForReview } from "./types";
import { hasPermission, isSameTeam } from "./permissions";
import { isOrgWideRole } from "./roles";

export function canApproveApprovalType(ctx: AccessContext, type: string): boolean {
  const role = ctx.role;
  switch (type) {
    case "LEAVE":
      return (
        role === "hr" ||
        role === "management" ||
        role === "super_admin" ||
        role === "team_lead"
      );
    case "EXPENSE":
      return role === "finance" || role === "management" || role === "super_admin";
    case "PROJECT_BUDGET":
      return role === "management" || role === "super_admin";
    case "HIRING":
      return role === "hr" || role === "management" || role === "super_admin";
    case "OTHER":
      return role === "management" || role === "super_admin";
    default:
      return role === "management" || role === "super_admin";
  }
}

export function canApproveApproval(ctx: AccessContext, approval: ApprovalForReview): boolean {
  if (approval.status !== "PENDING") return false;
  if (!hasPermission(ctx, "approvals:review")) return false;
  if (!canApproveApprovalType(ctx, approval.type)) return false;

  if (approval.type === "LEAVE" && ctx.role === "team_lead") {
    return isSameTeam(ctx, approval.teamId);
  }

  return true;
}

export function shouldIncludeApprovalInList(ctx: AccessContext, approval: ApprovalForReview): boolean {
  if (approval.requestedById === ctx.userId) return true;
  if (approval.status === "PENDING" && canApproveApproval(ctx, approval)) return true;
  if (isOrgWideRole(ctx.role) && hasPermission(ctx, "approvals:review")) {
    return approval.status !== "PENDING" || canApproveApprovalType(ctx, approval.type);
  }
  return false;
}

export function filterApprovalsForList<T extends ApprovalForReview>(ctx: AccessContext, items: T[]): T[] {
  return items.filter((a) => shouldIncludeApprovalInList(ctx, a));
}
