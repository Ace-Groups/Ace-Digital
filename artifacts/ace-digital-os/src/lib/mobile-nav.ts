import { getNavRoutesForRole, NAV_ROUTES, type NavRoute } from "@workspace/rbac";

/** Daily destinations for the bottom bar, in order, when the role can open them. */
function pinnedForRole(role: string): NavRoute[] {
  if (role === "super_admin" || role === "management" || role === "hr") {
    return ["dashboard", "attendance", "approvals", "channels"];
  }
  if (role === "finance") {
    return ["dashboard", "finance", "approvals", "channels"];
  }
  return ["dashboard", "tasks", "approvals", "channels"];
}

const FILL_ORDER: NavRoute[] = [
  "projects",
  "tasks",
  "employees",
  "finance",
  "clients",
  "service",
  "approvals",
  "reports",
  "activity",
  "attendance",
];

const MOBILE_PRIMARY_MAX = 4;

export type MobileNavItem = {
  route: NavRoute;
  href: string;
  label: string;
};

function labelForRoute(route: NavRoute, role: string): string {
  if (route === "dashboard") return "Home";
  if (route === "channels") return "Chat";
  if (route === "approvals" && role === "employee") return "Leave";
  if (route === "attendance" && (role === "super_admin" || role === "management" || role === "hr")) return "Roster";
  if (route === "employees" && role === "employee") return "Profile";
  if (route === "finance" && role === "employee") return "Payslip";
  const item = NAV_ROUTES.find((n) => n.route === route);
  return item?.label ?? route;
}

export function getMobileNavItems(role: string): {
  primary: MobileNavItem[];
  overflow: MobileNavItem[];
} {
  const allowed = new Set(getNavRoutesForRole(role));
  const items: MobileNavItem[] = NAV_ROUTES.filter((n) => allowed.has(n.route)).map((n) => ({
    route: n.route,
    href: n.href,
    label: labelForRoute(n.route, role),
  }));
  const byRoute = new Map(items.map((i) => [i.route, i]));

  const primaryRoutes: NavRoute[] = [];
  for (const route of pinnedForRole(role)) {
    if (primaryRoutes.length >= MOBILE_PRIMARY_MAX) break;
    if (allowed.has(route)) primaryRoutes.push(route);
  }
  for (const route of FILL_ORDER) {
    if (primaryRoutes.length >= MOBILE_PRIMARY_MAX) break;
    if (allowed.has(route) && !primaryRoutes.includes(route)) primaryRoutes.push(route);
  }

  const primary = primaryRoutes
    .map((r) => byRoute.get(r))
    .filter((i): i is MobileNavItem => i != null);
  const primarySet = new Set(primaryRoutes);
  const overflow = items.filter((i) => !primarySet.has(i.route));
  return { primary, overflow };
}
