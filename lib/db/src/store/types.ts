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
  SalaryPosting,
  ServiceTicket,
  ServiceRecord,
  Note,
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
  SalaryPosting,
  ServiceTicket,
  ServiceRecord,
  Note,
};

export type SalaryPostingRow = {
  id: number;
  userId: number;
  fullName: string;
  allocationType: "MONTHLY" | "PROJECT";
  projectId: number | null;
  projectName: string | null;
  month: number;
  year: number;
  baseSalary: number;
  bonus: number;
  totalPay: number;
  createdAt: Date;
};

export type CreateSalaryPostingInput = {
  userId: number;
  allocationType: "MONTHLY" | "PROJECT";
  projectId?: number | null;
  month: number;
  year: number;
  baseSalary: string;
  bonus: string;
  createdById: number;
};

export type { AccessContext } from "./scoping";

export type ActivityLogWithActor = ActivityLog & { actorName: string | null };
export type MessageWithSender = Message & {
  senderName: string | null;
  senderAvatar?: string | null;
  isDeletedUser?: boolean;
};
export type SalaryRow = {
  userId: number;
  fullName: string;
  teamId: number | null;
  jobTitle: string | null;
  baseSalary: number;
  bonus: number;
  payrollStatus: string;
  salaryMode: string;
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
  overdueServiceFollowUpsCount?: number;
  upcomingCalendar?: {
    id: string;
    kind: string;
    title: string;
    startAt: string;
    readOnly: boolean;
    eventId?: number;
    taskId?: number;
  }[];
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
  avatarUrl?: string | null;
  dob?: Date | null;
  address?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  nationality?: string | null;
  aadhaarNumber?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactPhone?: string | null;
  highestQualification?: string | null;
  bloodGroup?: string | null;
  aadhaarDocument?: string | null;
  bankAccountNumber?: string | null;
  bankIfscCode?: string | null;
  bankName?: string | null;
  bankAccountHolderName?: string | null;
  panNumber?: string | null;
  bankAccountType?: string | null;
  upiId?: string | null;
  workType?: string | null;
  notes?: string | null;
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
  dob: Date | null;
  address: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  gender: string | null;
  maritalStatus: string | null;
  nationality: string | null;
  aadhaarNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
  highestQualification: string | null;
  bloodGroup: string | null;
  aadhaarDocument: string | null;
  bankAccountNumber: string | null;
  bankIfscCode: string | null;
  bankName: string | null;
  bankAccountHolderName: string | null;
  panNumber: string | null;
  bankAccountType: string | null;
  upiId: string | null;
  workType: string | null;
  notes: string | null;
  verifySlug: string | null;
  verifySlugEnabled: boolean;
  publicProfileEnabled: boolean;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  publicPhone: string | null;
  publicEmail: string | null;
  officeAddress: string | null;
  publicBio: string | null;
}>;

export type CreateNotificationInput = {
  userId: number;
  title: string;
  body: string;
  link?: string | null;
};

export type CreateProfileInput = { userId: number; baseSalary?: string; bonus?: string; salaryMode?: string };
export type UpdateProfileInput = Partial<{
  baseSalary: string;
  bonus: string;
  payrollStatus: string;
  salaryMode: string;
}>;

export type ChannelMemberRole = "owner" | "member" | "viewer";

export type CreateChannelInput = {
  name: string;
  description?: string | null;
  teamId?: number | null;
  type?: string;
  visibility?: string;
  createdById: number;
  avatarUrl?: string | null;
};

export type UpdateChannelInput = Partial<{
  name: string;
  description: string | null;
  archived: boolean;
  avatarUrl: string | null;
}>;

export type ChannelMemberWithUser = ChannelMember & {
  fullName: string;
  avatarUrl: string | null;
  email: string | null;
  isUnavailable?: boolean;
};

export type CreateTeamInput = {
  name: string;
  color?: string | null;
};

export type CreateJobTitleInput = {
  name: string;
};

export type CreateNoteInput = {
  title: string;
  content: string;
  createdById: number;
  teamId?: number | null;
  sharedUserIds?: number[];
};

export type UpdateNoteInput = Partial<{
  title: string;
  content: string;
  teamId: number | null;
  sharedUserIds: number[];
}>;
