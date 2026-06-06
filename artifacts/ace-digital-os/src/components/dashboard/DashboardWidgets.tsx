import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, Users, TrendingUp } from "lucide-react";
import { formatRelativeTime, priorityColor, getInitials } from "@/lib/utils";
import { formatScheduleLabel } from "@/lib/calendar-core";
import type { DashboardData } from "@workspace/api-client-react";

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
