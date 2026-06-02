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
  ChannelMember,
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
  ChannelMember,
  Message,
  Report,
  Expense,
  PayrollRun,
};

export type { AccessContext } from "./scoping";

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
  /** Role-tailored optional metrics */
  activeClientsCount?: number;
  contractValueTotal?: number;
  myOpenTasksCount?: number;
  widgets: string[];
};

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  fullName: string;
  role: string;
  teamId?: number | null;
  jobTitle?: string | null;
  phone?: string | null;
  employeeCode?: string | null;
  startDate?: Date | null;
  mustChangePassword?: boolean;
};

export type UpdateUserInput = Partial<{
  fullName: string;
  email: string;
  role: string;
  teamId: number | null;
  jobTitle: string | null;
  phone: string | null;
  employeeCode: string | null;
  startDate: Date | null;
  mustChangePassword: boolean;
  status: string;
  avatarUrl: string | null;
  passwordHash: string;
}>;

export type CreateNotificationInput = {
  userId: number;
  title: string;
  body: string;
  link?: string | null;
};

export type CreateProfileInput = { userId: number; baseSalary?: string; bonus?: string };
export type UpdateProfileInput = Partial<{
  baseSalary: string;
  bonus: string;
  payrollStatus: string;
}>;

export type ChannelMemberRole = "owner" | "member" | "viewer";

export type CreateChannelInput = {
  name: string;
  description?: string | null;
  teamId?: number | null;
  type?: string;
  visibility?: string;
  createdById: number;
};

export type UpdateChannelInput = Partial<{
  name: string;
  description: string | null;
  archived: boolean;
}>;

export type ChannelMemberWithUser = ChannelMember & {
  fullName: string;
  avatarUrl: string | null;
  email: string;
};

export type CreateTeamInput = {
  name: string;
  color?: string | null;
};

export type CreateJobTitleInput = {
  name: string;
};
