import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, Users, TrendingUp, BarChart3 } from "lucide-react";
import { formatRelativeTime, priorityColor, getInitials } from "@/lib/utils";
import { formatScheduleLabel } from "@/lib/calendar-core";
import type { DashboardData } from "@workspace/api-client-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";

interface DashboardWidgetsProps {
  widgets: Set<string>;
  dash?: DashboardData;
  isLoading: boolean;
  showChatColumn?: boolean;
}

export function UpcomingDeadlinesWidget({ dash, isLoading }: { dash?: DashboardData; isLoading: boolean }) {
  return (
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
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
        ) : dash?.upcomingDeadlines?.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No upcoming deadlines</p>
        ) : (
          <div className="space-y-2">
            {dash?.upcomingDeadlines?.map((p) => (
              <div key={p.id} data-testid={`deadline-project-${p.id}`} className="surface-muted flex items-center gap-3 p-3 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {p.teamName && <span className="mr-2">{p.teamName}</span>}
                    Due: {p.deadline ? new Date(p.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                  </p>
                </div>
                <Badge variant="outline" className={priorityColor(p.priority)}>{p.priority}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TeamLoadWidget({ dash, isLoading }: { dash?: DashboardData; isLoading: boolean }) {
  return (
    <Card className="h-full border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Users size={16} className="text-primary" aria-hidden />
          Team Load
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (dash?.teamLoad?.length ?? 0) === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Team load appears once active teams are available.</p>
        ) : (
          <div className="space-y-3">
            {dash?.teamLoad?.map((t) => (
              <div key={t.teamId} data-testid={`team-load-${t.teamId}`} className="list-row justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.teamName}</p>
                  <p className="text-xs text-muted-foreground">{t.members} members</p>
                </div>
                <Badge variant="secondary" className="shrink-0 tabular-nums">{t.activeProjects} projects</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function UpcomingCalendarWidget({ dash, isLoading }: { dash?: DashboardData; isLoading: boolean }) {
  if (!dash && isLoading) return null;
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Clock size={16} className="text-sky-500" aria-hidden />
          Upcoming schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
        ) : (dash?.upcomingCalendar?.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing scheduled soon</p>
        ) : (
          <div className="space-y-2">
            {dash?.upcomingCalendar?.map((item) => {
              const href = item.kind === "task" && item.taskId
                ? `/tasks?task=${item.taskId}`
                : item.eventId ? `/calendar?event=${item.eventId}` : "/calendar";
              return (
                <a key={item.id} href={href} className="surface-muted flex min-h-[44px] items-center justify-between gap-3 p-3 transition-colors hover:bg-muted/60">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{formatScheduleLabel(item.startAt)}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 capitalize">{item.kind.replace("_", " ")}</Badge>
                </a>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentActivityWidget({ dash, isLoading }: { dash?: DashboardData; isLoading: boolean }) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <TrendingUp size={16} className="text-primary" aria-hidden />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (dash?.recentActivity?.length ?? 0) === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No recent activity yet.</p>
        ) : (
          <div className="divide-y divide-border/60">
            {dash?.recentActivity?.slice(0, 8).map((a) => (
              <div key={a.id} data-testid={`activity-${a.id}`} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <Avatar className="mt-0.5 h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                    {getInitials(a.actorName ?? "?")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{a.actorName}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatRelativeTime(a.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


function projectChartLabel(name: string | null | undefined): { name: string; fullName: string } {
  const fullName = typeof name === "string" && name.trim() ? name : "Untitled";
  return {
    fullName,
    name: fullName.length > 15 ? `${fullName.substring(0, 12)}...` : fullName,
  };
}

export function WorkspaceAnalyticsWidget({ dash, isLoading }: { dash?: DashboardData; isLoading: boolean }) {
  const teamLoadData = dash?.teamLoad ?? [];
  const projectProgressData = isLoading
    ? []
    : (dash?.upcomingDeadlines ?? []).map((p) => {
        const label = projectChartLabel(p.name);
        return {
          ...label,
          Progress: p.progress ?? 0,
          Priority: p.priority ?? "MEDIUM",
        };
      });

  return (
    <Card className="border-border/70 overflow-hidden bg-card/45 dark:bg-[#0a0a0b]/45 shadow-sm dark:shadow-2xl relative backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/10">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
          <BarChart3 size={16} className="text-primary" />
          Workspace Insights & Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : (
          <Tabs defaultValue="progress" className="w-full">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
              <TabsList className="bg-muted/50 border border-border/30">
                <TabsTrigger value="progress" className="text-xs">Project Progress</TabsTrigger>
                <TabsTrigger value="workload" className="text-xs">Team Workload</TabsTrigger>
              </TabsList>
              <div className="text-[10px] text-muted-foreground flex gap-3 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-primary inline-block"></span> Progress (%) / Active Projects
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span> Members count
                </span>
              </div>
            </div>

            <TabsContent value="progress" className="mt-0">
              {projectProgressData.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                  No active projects available for insights
                </div>
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={projectProgressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                      <XAxis 
                        dataKey="name" 
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fill: "currentColor", className: "text-muted-foreground/80", fontSize: 10 }}
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => `${value}%`}
                        tick={{ fill: "currentColor", className: "text-muted-foreground/80", fontSize: 10 }}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-xl border border-border bg-popover/90 dark:bg-card/95 backdrop-blur-md p-3 shadow-xl text-xs space-y-1">
                                <p className="font-semibold text-foreground">{data.fullName}</p>
                                <p className="text-primary font-medium">Progress: {data.Progress}%</p>
                                <p className="text-muted-foreground uppercase text-[10px] tracking-wider font-bold">Priority: {data.Priority}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Progress" 
                        stroke="var(--color-primary, #6366f1)" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorProgress)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </TabsContent>

            <TabsContent value="workload" className="mt-0">
              {teamLoadData.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                  No active teams to display workload
                </div>
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamLoadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                      <XAxis 
                        dataKey="teamName" 
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fill: "currentColor", className: "text-muted-foreground/80", fontSize: 10 }}
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fill: "currentColor", className: "text-muted-foreground/80", fontSize: 10 }}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-xl border border-border bg-popover/90 dark:bg-card/95 backdrop-blur-md p-3 shadow-xl text-xs space-y-1">
                                <p className="font-semibold text-foreground">{data.teamName}</p>
                                <p className="text-primary font-medium">Active Projects: {data.activeProjects}</p>
                                <p className="text-emerald-500 font-medium">Members: {data.members}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="activeProjects" name="Active Projects" fill="var(--color-primary, #6366f1)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="members" name="Members" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardSecondaryWidgets({ widgets, dash, isLoading }: DashboardWidgetsProps) {
  return (
    <>
      {widgets.has("upcomingDeadlines") && <UpcomingDeadlinesWidget dash={dash} isLoading={isLoading} />}
      {widgets.has("teamLoad") && <TeamLoadWidget dash={dash} isLoading={isLoading} />}
      {widgets.has("upcomingCalendar") && <UpcomingCalendarWidget dash={dash} isLoading={isLoading} />}
      {widgets.has("recentActivity") && <RecentActivityWidget dash={dash} isLoading={isLoading} />}
    </>
  );
}
