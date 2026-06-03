import type { NavRoute } from "./types";
import { getPermissionsForRole } from "./permissions";

const ROUTE_PERMISSIONS: Record<NavRoute, string> = {
  dashboard: "dashboard:view",
  projects: "projects:read",
  tasks: "tasks:read",
  calendar: "calendar:read",
  employees: "employees:read",
  finance: "finance:summary",
  clients: "clients:read",
  approvals: "approvals:submit",
  reports: "reports:read",
  channels: "channels:read",
  activity: "activity:read",
};

/** Nav href paths */
export const NAV_ROUTES: { route: NavRoute; href: string; label: string }[] = [
  { route: "dashboard", href: "/", label: "Dashboard" },
  { route: "projects", href: "/projects", label: "Projects" },
  { route: "tasks", href: "/tasks", label: "Tasks" },
  { route: "calendar", href: "/calendar", label: "Calendar" },
  { route: "employees", href: "/employees", label: "Employees" },
  { route: "finance", href: "/finance", label: "Finance" },
  { route: "clients", href: "/clients", label: "Clients" },
  { route: "approvals", href: "/approvals", label: "Approvals" },
  { route: "reports", href: "/reports", label: "Reports" },
  { route: "channels", href: "/channels", label: "Chat" },
  { route: "activity", href: "/activity", label: "Activity" },
];

export function getNavRoutesForRole(role: string): NavRoute[] {
  const perms = new Set(getPermissionsForRole(role));
  const routes: NavRoute[] = [];

  for (const [route, perm] of Object.entries(ROUTE_PERMISSIONS) as [NavRoute, string][]) {
    if (route === "employees" && role === "employee") {
      if (perms.has("employees:read_self")) routes.push(route);
      continue;
    }
    if (route === "finance" && role === "employee") {
      if (perms.has("finance:salaries_self")) routes.push(route);
      continue;
    }
    if (perms.has(perm as never)) routes.push(route);
  }

  return routes;
}

export function canAccessRoute(role: string, href: string): boolean {
  const allowed = getNavRoutesForRole(role);
  const item = NAV_ROUTES.find((n) => n.href === href);
  if (!item) return true;
  return allowed.includes(item.route);
}
