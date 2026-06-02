import { AppLayout } from "@/components/layout/AppLayout";
import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import {
  FolderKanban, Users, DollarSign, ClipboardCheck,
  TrendingUp, Clock, Building2, CheckSquare,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatRelativeTime, priorityColor, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: dash, isLoading } = useGetDashboard();
  const firstName = user?.fullName?.split(" ")[0] ?? "there";
  const widgets = new Set(dash?.widgets ?? []);

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        <section className="brand-gradient relative overflow-hidden rounded-2xl p-6 text-white shadow-brand-md sm:p-8">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />
          <div className="relative">
            <p className="text-sm font-medium text-white/70">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl text-balance">
              {getGreeting()}, {firstName}
            </h2>
            <p className="mt-2 max-w-lg text-sm text-white/75">
              Here&apos;s what&apos;s happening at Ace Digital today.
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {widgets.has("activeProjects") && (
            <StatCard
              label="Active Projects"
              value={dash?.activeProjectsCount ?? 0}
              icon={FolderKanban}
              tone="brand"
              href="/projects"
              isLoading={isLoading}
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
              isLoading={isLoading}
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
              isLoading={isLoading}
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
              isLoading={isLoading}
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
              isLoading={isLoading}
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
              isLoading={isLoading}
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
              isLoading={isLoading}
              testId="stat-pending-approvals"
            />
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {widgets.has("upcomingDeadlines") && (
          <div className="lg:col-span-2">
            <Card>
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
            <Card className="h-full">
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
              </CardContent>
            </Card>
          </div>
          )}
        </div>

        {widgets.has("recentActivity") && (
        <Card>
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
          </CardContent>
        </Card>
        )}
      </div>
    </AppLayout>
  );
}
