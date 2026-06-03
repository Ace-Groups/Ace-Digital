import { getNavRoutesForRole, NAV_ROUTES, type NavRoute } from "@workspace/rbac";

const PRIMARY_ORDER: NavRoute[] = [
  "dashboard",
  "projects",
  "tasks",
  "calendar",
  "channels",
  "employees",
  "finance",
  "clients",
];

const MOBILE_PRIMARY_MAX = 4;

export type MobileNavItem = {
  route: NavRoute;
  href: string;
  label: string;
};

function labelForRoute(route: NavRoute, role: string): string {
  if (route === "channels") return "Chat";
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

  const primaryRoutes: NavRoute[] = [];
  for (const route of PRIMARY_ORDER) {
    if (primaryRoutes.length >= MOBILE_PRIMARY_MAX) break;
    if (allowed.has(route)) primaryRoutes.push(route);
  }

  if (primaryRoutes.length < MOBILE_PRIMARY_MAX) {
    for (const item of items) {
      if (primaryRoutes.length >= MOBILE_PRIMARY_MAX) break;
      if (!primaryRoutes.includes(item.route)) primaryRoutes.push(item.route);
    }
  }

  const primary = items.filter((i) => primaryRoutes.includes(i.route));
  const overflow = items.filter((i) => !primaryRoutes.includes(i.route));
  return { primary, overflow };
}
