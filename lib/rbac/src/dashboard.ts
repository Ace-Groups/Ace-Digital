import type { DashboardProfile, DashboardWidget } from "./types";
import { isRole } from "./roles";

const PROFILES: Record<string, DashboardWidget[]> = {
  super_admin: [
    "activeProjects",
    "employeeCount",
    "monthlyRevenue",
    "pendingApprovals",
    "overdueServiceFollowUps",
    "teamLoad",
    "recentActivity",
    "upcomingDeadlines",
    "upcomingCalendar",
  ],
  management: [
    "activeProjects",
    "employeeCount",
    "monthlyRevenue",
    "pendingApprovals",
    "overdueServiceFollowUps",
    "teamLoad",
    "recentActivity",
    "upcomingDeadlines",
    "upcomingCalendar",
  ],
  finance: [
    "monthlyRevenue",
    "pendingApprovals",
    "recentActivity",
  ],
  hr: ["employeeCount", "pendingApprovals", "pendingLeave", "recentActivity", "upcomingCalendar"],
  client_manager: [
    "activeClients",
    "contractValue",
    "activeProjects",
    "overdueServiceFollowUps",
    "upcomingDeadlines",
    "upcomingCalendar",
  ],
  team_lead: ["activeProjects", "myOpenTasks", "pendingLeave", "upcomingDeadlines", "teamLoad", "upcomingCalendar"],
  employee: ["myOpenTasks", "upcomingDeadlines", "upcomingCalendar"],
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
