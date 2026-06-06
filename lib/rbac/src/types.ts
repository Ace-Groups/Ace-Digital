export const ALL_ROLES = [
  "super_admin",
  "management",
  "finance",
  "hr",
  "client_manager",
  "team_lead",
  "employee",
] as const;

export type Role = (typeof ALL_ROLES)[number];

export type AccessContext = {
  userId: number;
  role: string;
  teamId: number | null;
};

export type ApprovalForReview = {
  type: string;
  requestedById: number;
  teamId: number | null;
  status: string;
};

export type NavRoute =
  | "dashboard"
  | "projects"
  | "tasks"
  | "calendar"
  | "employees"
  | "finance"
  | "clients"
  | "service"
  | "approvals"
  | "reports"
  | "channels"
  | "activity"
  | "notes";

export type DashboardWidget =
  | "activeProjects"
  | "employeeCount"
  | "monthlyRevenue"
  | "pendingApprovals"
  | "teamLoad"
  | "recentActivity"
  | "upcomingDeadlines"
  | "activeClients"
  | "contractValue"
  | "myOpenTasks"
  | "pendingLeave"
  | "upcomingCalendar"
  | "overdueServiceFollowUps";

export type DashboardProfile = {
  widgets: DashboardWidget[];
};
