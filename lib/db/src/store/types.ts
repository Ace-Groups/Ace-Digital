import type {
  User,
  Team,
  EmployeeProfile,
  Project,
  Task,
  Client,
  Approval,
  ActivityLog,
  Notification,
  Channel,
  Message,
  Report,
  Expense,
  PayrollRun,
} from "../schema";

export type {
  User,
  Team,
  EmployeeProfile,
  Project,
  Task,
  Client,
  Approval,
  ActivityLog,
  Notification,
  Channel,
  Message,
  Report,
  Expense,
  PayrollRun,
};

export type ActivityLogWithActor = ActivityLog & { actorName: string | null };
export type MessageWithSender = Message & { senderName: string | null };
export type SalaryRow = {
  userId: number;
  fullName: string;
  teamId: number | null;
  jobTitle: string | null;
  baseSalary: number;
  bonus: number;
  payrollStatus: string;
};

export type DashboardSnapshot = {
  activeProjectsCount: number;
  employeeCount: number;
  monthlyRevenue: number;
  pendingApprovalsCount: number;
  recentActivity: ActivityLogWithActor[];
  upcomingDeadlines: Project[];
  teamLoad: { teamId: number; teamName: string; activeProjects: number; members: number }[];
};

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  fullName: string;
  role: string;
  teamId?: number | null;
  jobTitle?: string | null;
};

export type UpdateUserInput = Partial<{
  fullName: string;
  role: string;
  teamId: number | null;
  jobTitle: string | null;
  status: string;
  avatarUrl: string | null;
}>;

export type CreateProfileInput = { userId: number; baseSalary?: string; bonus?: string };
export type UpdateProfileInput = Partial<{
  baseSalary: string;
  bonus: string;
  payrollStatus: string;
}>;
