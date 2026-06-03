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
  countOverdueServiceFollowUps?: () => Promise<number>;
};

export async function buildDashboardSnapshot(
  ctx: AccessContext,
  deps: DashboardDeps,
): Promise<DashboardSnapshot> {
  const profile = getDashboardProfile(ctx.role);
  const widgets = profile.widgets;

  const projectFilters =
    ctx.role === "team_lead" || ctx.role === "employee"
      ? { teamId: ctx.teamId ?? undefined }
      : undefined;
  const allProjectsPromise = deps.listProjects(projectFilters);
  const myTasksPromise = deps.listTasks({ assigneeId: ctx.userId });
  const pendingApprovalsPromise = deps.listApprovals({ status: "PENDING" });

  const employeeCountPromise = dashboardShowsWidget(ctx.role, "employeeCount")
    ? deps.countActiveUsers()
    : Promise.resolve(0);
  const monthlyRevenuePromise = dashboardShowsWidget(ctx.role, "monthlyRevenue")
    ? deps.sumActiveClientRevenue()
    : Promise.resolve(0);
  const clientsPromise = dashboardShowsWidget(ctx.role, "activeClients")
    ? deps.listClients()
    : Promise.resolve([]);
  const upcomingDeadlinesPromise = dashboardShowsWidget(ctx.role, "upcomingDeadlines")
    ? deps.listUpcomingDeadlines(10)
    : Promise.resolve([]);
  const recentActivityPromise = dashboardShowsWidget(ctx.role, "recentActivity")
    ? deps.listActivityLogs(10)
    : Promise.resolve([]);
  const overdueFollowUpsPromise = dashboardShowsWidget(ctx.role, "overdueServiceFollowUps")
    ? (deps.countOverdueServiceFollowUps?.() ?? Promise.resolve(0))
    : Promise.resolve(0);

  const teamLoadPromise: Promise<DashboardSnapshot["teamLoad"]> = dashboardShowsWidget(ctx.role, "teamLoad")
    ? (async () => {
        const teams = await deps.listTeams();
        const teamsToShow =
          ctx.role === "team_lead" && ctx.teamId != null
            ? teams.filter((t) => t.id === ctx.teamId)
            : teams;
        return Promise.all(
          teamsToShow.map(async (team) => {
            const [activeProjects, members] = await Promise.all([
              deps.countActiveProjectsByTeam(team.id),
              deps.countUsersByTeam(team.id),
            ]);
            return {
              teamId: team.id,
              teamName: team.name,
              activeProjects,
              members,
            };
          }),
        );
      })()
    : Promise.resolve([]);

  const [
    allProjects,
    myTasks,
    pendingApprovals,
    employeeCount,
    monthlyRevenue,
    clients,
    rawUpcomingDeadlines,
    recentActivity,
    teamLoad,
    overdueServiceFollowUpsCount,
  ] = await Promise.all([
    allProjectsPromise,
    myTasksPromise,
    pendingApprovalsPromise,
    employeeCountPromise,
    monthlyRevenuePromise,
    clientsPromise,
    upcomingDeadlinesPromise,
    recentActivityPromise,
    teamLoadPromise,
    overdueFollowUpsPromise,
  ]);

  const scopedProjects = scopeProjectList(ctx, allProjects);
  const activeProjectsCount = scopedProjects.filter((p) => p.status !== "DONE").length;

  const myOpenTasksCount = myTasks.filter((t) => t.status !== "DONE").length;

  const pendingApprovalsCount = countPendingApprovalsForContext(ctx, pendingApprovals);

  let activeClientsCount = 0;
  let contractValueTotal = 0;
  if (clients.length > 0) {
    const active = clients.filter((c) => c.status === "ACTIVE");
    activeClientsCount = active.length;
    contractValueTotal = active.reduce((s, c) => s + (c.contractValue ? Number(c.contractValue) : 0), 0);
  }

  const upcomingDeadlines: Project[] = scopeProjectList(ctx, rawUpcomingDeadlines).slice(0, 5);

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
    overdueServiceFollowUpsCount,
    widgets,
  };
}
