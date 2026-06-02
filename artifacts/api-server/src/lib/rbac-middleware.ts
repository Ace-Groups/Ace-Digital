import type { Request, Response, NextFunction } from "express";
import {
  getPermissionsForRole,
  hasAnyPermission,
  hasPermission,
  type Permission,
} from "@workspace/rbac";
import { getAccessContext } from "./access";

export function requirePermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const ctx = getAccessContext(req);
    if (!hasAnyPermission(ctx, permissions)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

export function requireAllPermissions(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const ctx = getAccessContext(req);
    if (!permissions.every((p) => hasPermission(ctx, p))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

export function attachPermissions(req: Request, _res: Response, next: NextFunction): void {
  if (req.user) {
    (req as Request & { permissions?: string[] }).permissions = getPermissionsForRole(
      req.user.role,
    );
  }
  next();
}
