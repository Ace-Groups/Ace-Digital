import type { DashboardProfile, DashboardWidget } from "./types";
import { isRole } from "./roles";

const PROFILES: Record<string, DashboardWidget[]> = {
  super_admin: [
    "activeProjects",
    "employeeCount",
    "monthlyRevenue",
    "pendingApprovals",
    "teamLoad",
    "recentActivity",
    "upcomingDeadlines",
  ],
  management: [
    "activeProjects",
    "employeeCount",
    "monthlyRevenue",
    "pendingApprovals",
    "teamLoad",
    "recentActivity",
    "upcomingDeadlines",
  ],
  finance: [
    "monthlyRevenue",
    "pendingApprovals",
    "recentActivity",
  ],
  hr: ["employeeCount", "pendingApprovals", "pendingLeave", "recentActivity"],
  client_manager: ["activeClients", "contractValue", "activeProjects", "upcomingDeadlines"],
  team_lead: ["activeProjects", "myOpenTasks", "pendingLeave", "upcomingDeadlines", "teamLoad"],
  employee: ["myOpenTasks", "upcomingDeadlines"],
};

export function getDashboardProfile(role: string): DashboardProfile {
  const widgets: DashboardWidget[] = isRole(role)
    ? (PROFILES[role] ?? ["myOpenTasks"])
    : ["myOpenTasks"];
  return { widgets: [...widgets] };
}

export function dashboardShowsWidget(role: string, widget: DashboardWidget): boolean {
  return getDashboardProfile(role).widgets.includes(widget);
}
