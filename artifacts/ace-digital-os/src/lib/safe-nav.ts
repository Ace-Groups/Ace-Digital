import { canAccessRoute, getDefaultRouteForRole } from "@workspace/rbac";

/** Resolve href to a route the role may access; falls back to default dashboard route. */
export function resolveSafeHref(role: string, href: string): string {
  const normalized = href.startsWith("/") ? href : `/${href}`;
  const path = normalized.split("?")[0].replace(/\/$/, "") || "/";
  if (canAccessRoute(role, path)) return normalized;
  return getDefaultRouteForRole(role);
}
