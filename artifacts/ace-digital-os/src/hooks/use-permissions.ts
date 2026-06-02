import { useMemo } from "react";
import {
  canApproveApproval,
  getPermissionsForRole,
  hasPermission,
  type ApprovalForReview,
  type Permission,
} from "@workspace/rbac";
import { useAuth } from "@/contexts/AuthContext";

export function usePermissions() {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) {
      return {
        permissions: [] as Permission[],
        can: (_p: Permission) => false,
        canApprove: (_a: ApprovalForReview) => false,
      };
    }
    const ctx = {
      userId: user.id,
      role: user.role,
      teamId: user.teamId,
    };
    const permissions = getPermissionsForRole(user.role);
    return {
      permissions,
      can: (p: Permission) => hasPermission(ctx, p),
      canApprove: (a: ApprovalForReview) => canApproveApproval(ctx, a),
    };
  }, [user]);
}
