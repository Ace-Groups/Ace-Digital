import { AppLayout } from "@/components/layout/AppLayout";
import { getGetDashboardQueryKey, useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import {
  FolderKanban, Users, DollarSign, ClipboardCheck,
  TrendingUp, Clock, Building2, CheckSquare,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { StaggerItem, StaggerList } from "@/components/design";
import { formatCurrency, formatRelativeTime, priorityColor, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMemo } from "react";
import { ChatWidget } from "@/components/dashboard/ChatWidget";
import { usePermissions } from "@/hooks/use-permissions";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const showChat = can("channels:read");
  const { data: dash, isLoading, isFetching } = useGetDashboard({
    query: {
      queryKey: getGetDashboardQueryKey(),
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });
  const firstName = user?.fullName?.split(" ")[0] ?? "there";
  const widgets = useMemo(() => new Set(dash?.widgets ?? []), [dash?.widgets]);
  const dashboardDate = useMemo(
    () =>
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    [],
  );

  const statCards = (
    <>
      {widgets.has("activeProjects") && (
        <StatCard
          label="Active Projects"
          value={dash?.activeProjectsCount ?? 0}
          icon={FolderKanban}
          tone="brand"
          href="/projects"
          isLoading={isLoading && !dash}
          testId="stat-active-projects"
        />
      )}
      {widgets.has("myOpenTasks") && (
        <StatCard
          label="My Open Tasks"
          value={dash?.myOpenTasksCount ?? 0}
          icon={CheckSquare}
          tone="brand"
          href="/tasks"
          isLoading={isLoading && !dash}
          testId="stat-my-tasks"
        />
      )}
      {widgets.has("employeeCount") && (
        <StatCard
          label="Total Employees"
          value={dash?.employeeCount ?? 0}
          icon={Users}
          tone="success"
          href="/employees"
          isLoading={isLoading && !dash}
          testId="stat-total-employees"
        />
      )}
      {widgets.has("activeClients") && (
        <StatCard
          label="Active Clients"
          value={dash?.activeClientsCount ?? 0}
          icon={Building2}
          tone="success"
          href="/clients"
          isLoading={isLoading && !dash}
          testId="stat-active-clients"
        />
      )}
      {widgets.has("contractValue") && (
        <StatCard
          label="Contract Value"
          value={formatCurrency(dash?.contractValueTotal ?? 0)}
          icon={DollarSign}
          tone="warning"
          href="/clients"
          isLoading={isLoading && !dash}
          testId="stat-contract-value"
        />
      )}
      {widgets.has("monthlyRevenue") && (
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(dash?.monthlyRevenue ?? 0)}
          icon={DollarSign}
          tone="warning"
          href="/finance"
          isLoading={isLoading && !dash}
          testId="stat-monthly-revenue"
        />
      )}
      {widgets.has("pendingApprovals") && (
        <StatCard
          label="Pending Approvals"
          value={dash?.pendingApprovalsCount ?? 0}
          icon={ClipboardCheck}
          tone="danger"
          href="/approvals"
          isLoading={isLoading && !dash}
          testId="stat-pending-approvals"
        />
      )}
    </>
  );

  return (
    <AppLayout title="Dashboard">
      <StaggerList className="page-stack">
        <StaggerItem>
          <section className="brand-gradient relative overflow-hidden rounded-2xl border border-white/10 p-5 text-white shadow-brand-md sm:p-7 lg:p-8">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white/70">{dashboardDate}</p>
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80">
                {isFetching && !dash ? "Syncing..." : "Live"}
              </span>
            </div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl text-balance">
              {getGreeting()}, {firstName}
            </h2>
            <p className="mt-2 max-w-lg text-sm text-white/75 sm:text-[0.95rem]">
              Here&apos;s what&apos;s happening at Ace Digital today.
            </p>
          </div>
        </section>
        </StaggerItem>

        <StaggerItem>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {statCards}
          </div>
        </StaggerItem>

        <StaggerItem>
        <div className="grid gap-4 lg:grid-cols-3 xl:gap-6">
          {showChat && (
            <div className="lg:col-span-1">
              <ChatWidget />
            </div>
          )}
          {widgets.has("upcomingDeadlines") && (
          <div className={showChat ? "lg:col-span-2" : "lg:col-span-3"}>
            <Card className="border-border/70">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Clock size={16} className="text-amber-500" aria-hidden />
                  Upcoming Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-lg" />
                    ))}
                  </div>
                ) : dash?.upcomingDeadlines?.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No upcoming deadlines
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dash?.upcomingDeadlines?.map((p) => (
                      <div
                        key={p.id}
                        data-testid={`deadline-project-${p.id}`}
                        className="surface-muted flex items-center gap-4 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {p.name}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {p.teamName && <span className="mr-2">{p.teamName}</span>}
                            Due:{" "}
                            {p.deadline
                              ? new Date(p.deadline).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                })
                              : "—"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant="outline" className={priorityColor(p.priority)}>
                            {p.priority}
                          </Badge>
                          <div className="w-16">
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${p.progress}%` }}
                              />
                            </div>
                            <p className="mt-0.5 text-right text-xs tabular-nums text-muted-foreground">
                              {p.progress}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          )}

          {widgets.has("teamLoad") && (
          <div className={widgets.has("upcomingDeadlines") ? "" : "lg:col-span-3"}>
            <Card className="h-full border-border/70">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Users size={16} className="text-primary" aria-hidden />
                  Team Load
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dash?.teamLoad?.map((t) => (
                      <div
                        key={t.teamId}
                        data-testid={`team-load-${t.teamId}`}
                        className="list-row justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{t.teamName}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.members} members
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 tabular-nums">
                          {t.activeProjects} projects
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
                {!isLoading && (dash?.teamLoad?.length ?? 0) === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Team load appears once active teams are available.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
          )}
        </div>
        </StaggerItem>

        {widgets.has("upcomingCalendar") && (
        <StaggerItem>
          <Card className="border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Clock size={16} className="text-sky-500" aria-hidden />
                Upcoming schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : (dash?.upcomingCalendar?.length ?? 0) === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nothing scheduled soon</p>
              ) : (
                <div className="space-y-2">
                  {dash?.upcomingCalendar?.map((item) => {
                    const href =
                      item.kind === "task" && item.taskId
                        ? `/tasks?task=${item.taskId}`
                        : item.eventId
                          ? `/calendar?event=${item.eventId}`
                          : "/calendar";
                    return (
                    <a
                      key={item.id}
                      href={href}
                      className="surface-muted flex items-center justify-between gap-3 p-3 transition-colors hover:bg-muted/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{formatRelativeTime(item.startAt)}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0 capitalize">
                        {item.kind.replace("_", " ")}
                      </Badge>
                    </a>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </StaggerItem>
        )}

        {widgets.has("recentActivity") && (
        <StaggerItem>
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp size={16} className="text-primary" aria-hidden />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {dash?.recentActivity?.slice(0, 8).map((a) => (
                  <div
                    key={a.id}
                    data-testid={`activity-${a.id}`}
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <Avatar className="mt-0.5 h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                        {getInitials(a.actorName ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{a.actorName}</span>{" "}
                        <span className="text-muted-foreground">{a.action}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatRelativeTime(a.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!isLoading && (dash?.recentActivity?.length ?? 0) === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No recent activity yet. Updates appear here as your team works.
              </p>
            )}
          </CardContent>
        </Card>
        </StaggerItem>
        )}
      </StaggerList>
    </AppLayout>
  );
}
