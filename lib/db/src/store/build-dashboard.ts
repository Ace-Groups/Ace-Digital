import { getDashboardProfile } from "@workspace/rbac";
import type { AccessContext } from "./scoping";
import {
  countPendingApprovalsForContext,
  dashboardShowsWidget,
  scopeProjectList,
  scopeTaskList,
} from "./scoping";
import type { ActivityLogWithActor, DashboardSnapshot } from "./types";
import type { Approval, Project } from "../schema";

type DashboardDeps = {
  listProjects: (filters?: { status?: string; teamId?: number }) => Promise<Project[]>;
  listTasks: (filters?: {
    projectId?: number;
    teamId?: number;
    assigneeId?: number;
    status?: string;
  }) => Promise<{ id: number; status: string; assigneeId: number | null; teamId: number | null }[]>;
  listApprovals: (filters?: { status?: string }) => Promise<Approval[]>;
  listTeams: () => Promise<{ id: number; name: string }[]>;
  countActiveUsers: () => Promise<number>;
  sumActiveClientRevenue: () => Promise<number>;
  listClients: () => Promise<{ status: string; contractValue: string | null }[]>;
  listActivityLogs: (limit: number) => Promise<ActivityLogWithActor[]>;
  listUpcomingDeadlines: (limit: number) => Promise<Project[]>;
  countActiveProjectsByTeam: (teamId: number) => Promise<number>;
  countUsersByTeam: (teamId: number) => Promise<number>;
};

export async function buildDashboardSnapshot(
  ctx: AccessContext,
  deps: DashboardDeps,
): Promise<DashboardSnapshot> {
  const profile = getDashboardProfile(ctx.role);
  const widgets = profile.widgets;

  const allProjects = await deps.listProjects();
  const scopedProjects = scopeProjectList(ctx, allProjects);
  const activeProjectsCount = scopedProjects.filter((p) => p.status !== "DONE").length;

  const allTasks = await deps.listTasks();
  const scopedTasks = scopeTaskList(ctx, allTasks as Parameters<typeof scopeTaskList>[1]);
  const myOpenTasksCount = scopedTasks.filter(
    (t) => t.status !== "DONE" && t.assigneeId === ctx.userId,
  ).length;

  const allApprovals = await deps.listApprovals();
  const pendingApprovalsCount = countPendingApprovalsForContext(ctx, allApprovals);

  let employeeCount = 0;
  if (dashboardShowsWidget(ctx.role, "employeeCount")) {
    employeeCount = await deps.countActiveUsers();
  }

  let monthlyRevenue = 0;
  if (dashboardShowsWidget(ctx.role, "monthlyRevenue")) {
    monthlyRevenue = await deps.sumActiveClientRevenue();
  }

  let activeClientsCount = 0;
  let contractValueTotal = 0;
  if (dashboardShowsWidget(ctx.role, "activeClients")) {
    const clients = await deps.listClients();
    const active = clients.filter((c) => c.status === "ACTIVE");
    activeClientsCount = active.length;
    contractValueTotal = active.reduce((s, c) => s + (c.contractValue ? Number(c.contractValue) : 0), 0);
  }

  let upcomingDeadlines: Project[] = [];
  if (dashboardShowsWidget(ctx.role, "upcomingDeadlines")) {
    const raw = await deps.listUpcomingDeadlines(10);
    upcomingDeadlines = scopeProjectList(ctx, raw).slice(0, 5);
  }

  let teamLoad: DashboardSnapshot["teamLoad"] = [];
  if (dashboardShowsWidget(ctx.role, "teamLoad")) {
    const teams = await deps.listTeams();
    const teamsToShow =
      ctx.role === "team_lead" && ctx.teamId != null
        ? teams.filter((t) => t.id === ctx.teamId)
        : teams;
    teamLoad = await Promise.all(
      teamsToShow.map(async (team) => ({
        teamId: team.id,
        teamName: team.name,
        activeProjects: await deps.countActiveProjectsByTeam(team.id),
        members: await deps.countUsersByTeam(team.id),
      })),
    );
  }

  let recentActivity: ActivityLogWithActor[] = [];
  if (dashboardShowsWidget(ctx.role, "recentActivity")) {
    recentActivity = await deps.listActivityLogs(10);
  }

  return {
    activeProjectsCount,
    employeeCount,
    monthlyRevenue,
    pendingApprovalsCount,
    recentActivity,
    upcomingDeadlines,
    teamLoad,
    activeClientsCount,
    contractValueTotal,
    myOpenTasksCount,
    widgets,
  };
}
