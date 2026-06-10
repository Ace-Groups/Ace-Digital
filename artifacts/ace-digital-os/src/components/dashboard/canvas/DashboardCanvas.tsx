import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  DollarSign,
  FolderKanban,
  HelpCircle,
  Layers,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { DashboardData } from "@workspace/api-client-react";
import {
  getListNotificationsQueryKey,
  useListChannels,
  useListNotifications,
} from "@workspace/api-client-react";
import { StaggerItem, StaggerList } from "@/components/design";
import { Skeleton } from "@/components/ui/skeleton";
import { AceAiAvatar } from "@/components/ai/AceAiAvatar";
import { useAceAssistant } from "@/contexts/AceAssistantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useStandaloneMode } from "@/hooks/use-standalone-mode";
import { formatUnreadBadge } from "@/lib/chat-display";
import { formatCurrency, formatRelativeTime, getInitials } from "@/lib/utils";
import { formatScheduleLabel } from "@/lib/calendar-core";
import { getGreeting, useDashboardPage } from "../useDashboardPage";
import { ChatWidget } from "../ChatWidget";
import { HomeScreenWidgets } from "@/components/pwa/HomeScreenWidgets";
import "@/styles/dashboard-canvas.css";

const SPOTLIGHT_KEY = "ace-dashboard-spotlight-dismissed";

const DONUT_COLORS = [
  "hsl(var(--primary))",
  "hsl(174 72% 48%)",
  "hsl(38 92% 50%)",
  "hsl(280 65% 55%)",
  "hsl(220 70% 55%)",
];

const ACE_PROMPTS = [
  "Summarize my dashboard KPIs",
  "What needs my attention today?",
  "Any pending approvals for me?",
];

type MetricDef = {
  key: string;
  widget: string;
  label: string;
  value: string | number;
  href: string;
  icon: typeof FolderKanban;
  iconBg: string;
  iconColor: string;
};

function computeSetupProgress(
  dash: DashboardData | undefined,
  hasActivity: boolean,
): number {
  if (!dash) return 12;
  let score = 25;
  if ((dash.myOpenTasksCount ?? 0) > 0 || (dash.activeProjectsCount ?? 0) > 0) score += 25;
  if (hasActivity) score += 25;
  if ((dash.upcomingCalendar?.length ?? 0) > 0) score += 25;
  return Math.min(100, score);
}

function buildMetrics(
  widgets: Set<string>,
  dash: DashboardData | undefined,
  isLoading: boolean,
): MetricDef[] {
  const loading = isLoading && !dash;
  const list: MetricDef[] = [];

  const push = (def: Omit<MetricDef, "value"> & { raw: number | string | undefined; format?: (n: number) => string }) => {
    if (!widgets.has(def.widget)) return;
    list.push({
      ...def,
      value: loading ? "…" : def.format ? def.format(Number(def.raw ?? 0)) : (def.raw ?? 0),
    });
  };

  push({
    key: "projects",
    widget: "activeProjects",
    label: "Active projects",
    raw: dash?.activeProjectsCount,
    href: "/projects",
    icon: FolderKanban,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  });
  push({
    key: "tasks",
    widget: "myOpenTasks",
    label: "Open tasks",
    raw: dash?.myOpenTasksCount,
    href: "/tasks",
    icon: CheckSquare,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  });
  push({
    key: "employees",
    widget: "employeeCount",
    label: "Team members",
    raw: dash?.employeeCount,
    href: "/employees",
    icon: Users,
    iconBg: "bg-sky-500/10",
    iconColor: "text-sky-600 dark:text-sky-400",
  });
  push({
    key: "clients",
    widget: "activeClients",
    label: "Active clients",
    raw: dash?.activeClientsCount,
    href: "/clients",
    icon: Building2,
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
  });
  push({
    key: "revenue",
    widget: "monthlyRevenue",
    label: "Monthly revenue",
    raw: dash?.monthlyRevenue,
    format: formatCurrency,
    href: "/finance",
    icon: DollarSign,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
  });
  push({
    key: "approvals",
    widget: "pendingApprovals",
    label: "Pending approvals",
    raw: dash?.pendingApprovalsCount,
    href: "/approvals",
    icon: ClipboardCheck,
    iconBg: "bg-red-500/10",
    iconColor: "text-red-600 dark:text-red-400",
  });

  return list;
}

function DashboardCommandBar({
  orgName,
  roleLabel,
  progress,
  onAskAce,
}: {
  orgName: string;
  roleLabel: string;
  progress: number;
  onAskAce: () => void;
}) {
  return (
    <header className="dash-command-bar">
      <div className="dash-command-brand">
        <div className="dash-command-logo" aria-hidden>
          Ace
        </div>
        <div className="min-w-0">
          <p className="dash-command-org truncate">{orgName}</p>
          <p className="dash-command-role">{roleLabel.replace(/_/g, " ")}</p>
        </div>
      </div>

      <button
        type="button"
        className="dash-command-search"
        onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
      >
        <Search size={15} aria-hidden />
        <span className="truncate">Search workspace or run a command…</span>
      </button>

      <div className="dash-command-progress" aria-label={`Workspace setup ${progress}%`}>
        <span className="dash-command-progress-label">Getting started · {progress}%</span>
        <div className="dash-command-progress-track">
          <div className="dash-command-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="dash-command-actions">
        <Link href="/notifications" className="dash-command-btn dash-command-btn--ghost">
          <Bell size={16} aria-hidden />
          <span className="hidden sm:inline">Alerts</span>
        </Link>
        <button type="button" className="dash-command-btn dash-command-btn--ghost" onClick={onAskAce}>
          <HelpCircle size={16} aria-hidden />
          <span className="hidden sm:inline">Help</span>
        </button>
        <button type="button" className="dash-command-btn dash-command-btn--primary" onClick={onAskAce}>
          <Sparkles size={16} aria-hidden />
          Ask Ace
        </button>
      </div>
    </header>
  );
}

function DashboardSpotlight() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(SPOTLIGHT_KEY) === "1",
  );
  const isStandalone = useStandaloneMode();

  if (dismissed) return null;

  return (
    <div className="dash-spotlight" role="region" aria-label="What's new">
      <div className="dash-spotlight-icon">
        <Zap size={18} aria-hidden />
      </div>
      <div className="dash-spotlight-body">
        <p className="dash-spotlight-title">
          {isStandalone ? "You're on the home screen app" : "New dashboard experience"}
        </p>
        <p className="dash-spotlight-text">
          {isStandalone
            ? "Long-press the Ace icon for shortcuts to Tasks, Chat, Calendar, and Notes. Your live widgets update in real time below."
            : "Install Ace Digital for home-screen widgets, unread badges on the app icon, and one-tap shortcuts to your workspace."}
        </p>
        <Link href={isStandalone ? "/notes" : "/settings"} className="dash-spotlight-cta">
          {isStandalone ? "Open Notes" : "Explore settings"}
        </Link>
      </div>
      <button
        type="button"
        className="dash-spotlight-close"
        aria-label="Dismiss"
        onClick={() => {
          localStorage.setItem(SPOTLIGHT_KEY, "1");
          setDismissed(true);
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

function MetricRail({ metrics }: { metrics: MetricDef[] }) {
  if (metrics.length === 0) return null;

  return (
    <div className="dash-metric-rail">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <Link key={m.key} href={m.href} className="dash-metric-card">
            <div className={`dash-metric-icon ${m.iconBg}`}>
              <Icon size={16} className={m.iconColor} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="dash-metric-label">{m.label}</p>
              <p className="dash-metric-value">{m.value}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function WorkspaceDonut({
  dash,
  isLoading,
  widgets,
}: {
  dash?: DashboardData;
  isLoading: boolean;
  widgets: Set<string>;
}) {
  const segments = useMemo(() => {
    const items: { name: string; value: number }[] = [];
    if (widgets.has("activeProjects") && (dash?.activeProjectsCount ?? 0) > 0) {
      items.push({ name: "Projects", value: dash!.activeProjectsCount });
    }
    if (widgets.has("myOpenTasks") && (dash?.myOpenTasksCount ?? 0) > 0) {
      items.push({ name: "Tasks", value: dash!.myOpenTasksCount! });
    }
    if (widgets.has("pendingApprovals") && (dash?.pendingApprovalsCount ?? 0) > 0) {
      items.push({ name: "Approvals", value: dash!.pendingApprovalsCount });
    }
    if (widgets.has("employeeCount") && (dash?.employeeCount ?? 0) > 0) {
      items.push({ name: "People", value: dash!.employeeCount });
    }
    if (items.length === 0) {
      items.push({ name: "Workspace", value: 1 });
    }
    return items;
  }, [dash, widgets]);

  const total = segments.reduce((s, x) => s + x.value, 0);

  return (
    <div className="dash-panel">
      <div className="dash-panel-header">
        <span className="dash-panel-title">Workspace composition</span>
        <BarChart3 size={16} className="text-primary" aria-hidden />
      </div>
      <div className="dash-panel-body">
        {isLoading && !dash ? (
          <Skeleton className="h-[220px] w-full rounded-xl" />
        ) : (
          <div className="dash-donut-wrap">
            <div className="dash-donut-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={segments}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="58%"
                    outerRadius="82%"
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {segments.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="dash-donut-center">
                <span className="dash-donut-center-value">{total}</span>
                <span className="dash-donut-center-label">Active units</span>
              </div>
            </div>
            <div className="dash-legend">
              {segments.map((seg, i) => {
                const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
                const color = DONUT_COLORS[i % DONUT_COLORS.length];
                return (
                  <div key={seg.name} className="dash-legend-row">
                    <span className="dash-legend-dot" style={{ background: color }} />
                    <div className="dash-legend-meta">
                      <p className="dash-legend-name">{seg.name}</p>
                      <div className="dash-legend-bar">
                        <div
                          className="dash-legend-bar-fill"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    </div>
                    <span className="dash-legend-pct">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityPanel({
  dash,
  isLoading,
  actionCount,
}: {
  dash?: DashboardData;
  isLoading: boolean;
  actionCount: number;
}) {
  const activityStats = useMemo(() => {
    const deadlines = dash?.upcomingDeadlines?.length ?? 0;
    const calendar = dash?.upcomingCalendar?.length ?? 0;
    const teams = dash?.teamLoad?.length ?? 0;
    const activity = dash?.recentActivity?.length ?? 0;
    return [
      { label: "Upcoming deadlines", value: deadlines, trend: deadlines > 0 },
      { label: "Scheduled items", value: calendar, trend: calendar > 0 },
      { label: "Active teams", value: teams, trend: teams > 0 },
      { label: "Recent events", value: activity, trend: activity > 0 },
    ];
  }, [dash]);

  return (
    <div className="dash-panel">
      <div className="dash-panel-header">
        <span className="dash-panel-title">Activity</span>
        <TrendingUp size={16} className="text-primary" aria-hidden />
      </div>
      <div className="dash-panel-body">
        {actionCount > 0 && (
          <div className="dash-activity-actions">
            <Zap size={14} className="text-primary" aria-hidden />
            {actionCount} action item{actionCount === 1 ? "" : "s"} need attention
          </div>
        )}
        {isLoading && !dash ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div className="dash-activity-list">
              {activityStats.map((row) => (
                <div key={row.label} className="dash-activity-item">
                  <span className="text-sm text-foreground">{row.label}</span>
                  <span className="dash-activity-trend">
                    {row.trend && <TrendingUp size={12} aria-hidden />}
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            {(dash?.recentActivity?.length ?? 0) > 0 && (
              <div className="mt-4 space-y-3 border-t border-border/40 pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Latest
                </p>
                {dash!.recentActivity.slice(0, 3).map((a) => (
                  <div key={a.id} className="flex items-start gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {getInitials(a.actorName ?? "?")}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs leading-snug">
                        <span className="font-semibold">{a.actorName}</span>{" "}
                        <span className="text-muted-foreground">{a.action}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(a.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MomentumRow({
  dash,
  isLoading,
  widgets,
}: {
  dash?: DashboardData;
  isLoading: boolean;
  widgets: Set<string>;
}) {
  const deadline = dash?.upcomingDeadlines?.[0];
  const progress = deadline?.progress ?? 0;
  const daysLeft = deadline?.deadline
    ? Math.max(
        0,
        Math.ceil(
          (new Date(deadline.deadline).getTime() - Date.now()) / 86_400_000,
        ),
      )
    : null;

  const teamCapacity = useMemo(() => {
    const load = dash?.teamLoad ?? [];
    if (load.length === 0) return 0;
    const max = load.reduce((m, t) => Math.max(m, t.activeProjects), 0);
    const avg = load.reduce((s, t) => s + t.activeProjects, 0) / load.length;
    return max > 0 ? Math.round((avg / max) * 100) : 0;
  }, [dash?.teamLoad]);

  if (!widgets.has("upcomingDeadlines") && !widgets.has("teamLoad")) return null;

  return (
    <div className="dash-bottom-grid">
      {widgets.has("upcomingDeadlines") && (
        <div className="dash-panel">
          <div className="dash-panel-header">
            <span className="dash-panel-title">Project momentum</span>
            <Layers size={16} className="text-primary" aria-hidden />
          </div>
          <div className="dash-panel-body">
            {isLoading && !dash ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : deadline ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{deadline.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {deadline.teamName ? `${deadline.teamName} · ` : ""}
                      {progress}% complete
                    </p>
                  </div>
                  {daysLeft != null && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {daysLeft}d left
                    </span>
                  )}
                </div>
                <div className="dash-momentum-track">
                  <div className="dash-momentum-fill" style={{ width: `${progress}%` }} />
                  <div className="dash-momentum-marker" style={{ left: `${progress}%` }} />
                </div>
                <div className="dash-momentum-labels">
                  <span>Start</span>
                  <span>Goal</span>
                </div>
              </>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No active project deadlines
              </p>
            )}
          </div>
        </div>
      )}

      {widgets.has("teamLoad") && (
        <div className="dash-panel">
          <div className="dash-panel-header">
            <span className="dash-panel-title">Team capacity</span>
            <Users size={16} className="text-primary" aria-hidden />
          </div>
          <div className="dash-panel-body">
            {isLoading && !dash ? (
              <Skeleton className="h-16 w-full rounded-xl" />
            ) : (
              <>
                <p className="text-2xl font-bold tabular-nums">{teamCapacity}%</p>
                <p className="mt-1 text-xs text-muted-foreground">Average load vs peak team</p>
                <div className="dash-pool-bar">
                  <div className="dash-pool-fill" style={{ width: `${teamCapacity}%` }} />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {(dash?.teamLoad?.length ?? 0)} team{(dash?.teamLoad?.length ?? 0) === 1 ? "" : "s"} tracked
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AceStrip() {
  const { openWithPrompt } = useAceAssistant();

  return (
    <div className="dash-ace-strip">
      <AceAiAvatar size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Ace Intelligence
        </p>
        <p className="text-sm font-medium">Ask anything about your workspace</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {ACE_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => openWithPrompt(p)}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary/30 hover:bg-primary/5"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DashboardCanvas() {
  const { user } = useAuth();
  const { openWithPrompt } = useAceAssistant();
  const {
    dash,
    isLoading,
    firstName,
    widgets,
    dashboardDate,
    roleLabel,
    showChat,
  } = useDashboardPage();

  const { data: notifications } = useListNotifications({
    query: {
      queryKey: getListNotificationsQueryKey(),
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  });
  const { data: channels } = useListChannels({
    query: { staleTime: 60_000, refetchOnWindowFocus: false },
  });

  const [timeStr, setTimeStr] = useState("");
  useEffect(() => {
    const tick = () =>
      setTimeStr(
        new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const metrics = buildMetrics(widgets, dash, isLoading);
  const notifUnread = notifications?.filter((n) => !n.read).length ?? 0;
  const chatUnread = (channels ?? []).reduce((n, c) => n + (c.unreadCount ?? 0), 0);
  const actionCount =
    (dash?.pendingApprovalsCount ?? 0) +
    notifUnread +
    chatUnread +
    (dash?.overdueServiceFollowUpsCount ?? 0);
  const setupProgress = computeSetupProgress(
    dash,
    (dash?.recentActivity?.length ?? 0) > 0,
  );
  const greeting = getGreeting();
  const orgName = user?.fullName ?? "Ace Digital";

  const nextCal = dash?.upcomingCalendar?.[0];

  return (
    <StaggerList className="dash-canvas">
      <StaggerItem>
        <p className="text-xs font-medium text-muted-foreground">{dashboardDate}</p>
        <h1 className="dash-greeting-inline mt-1">
          {greeting}, {firstName}
        </h1>
        {timeStr && (
          <p className="mt-1 font-mono text-xs text-primary">{timeStr}</p>
        )}
      </StaggerItem>

      <StaggerItem>
        <DashboardCommandBar
          orgName={orgName}
          roleLabel={roleLabel}
          progress={setupProgress}
          onAskAce={() => openWithPrompt("What needs my attention today?")}
        />
      </StaggerItem>

      <StaggerItem>
        <DashboardSpotlight />
      </StaggerItem>

      <StaggerItem>
        <div className="dash-main-grid">
          <MetricRail metrics={metrics} />
          <WorkspaceDonut dash={dash} isLoading={isLoading} widgets={widgets} />
          <ActivityPanel dash={dash} isLoading={isLoading} actionCount={actionCount} />
        </div>
      </StaggerItem>

      <StaggerItem>
        <MomentumRow dash={dash} isLoading={isLoading} widgets={widgets} />
      </StaggerItem>

      {nextCal && widgets.has("upcomingCalendar") && (
        <StaggerItem>
          <div className="dash-panel">
            <div className="dash-panel-header">
              <span className="dash-panel-title">Up next on calendar</span>
              <CalendarDays size={16} className="text-sky-500" aria-hidden />
            </div>
            <div className="dash-panel-body">
              <Link
                href={nextCal.eventId ? `/calendar?event=${nextCal.eventId}` : "/calendar"}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/30 p-3 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">{nextCal.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatScheduleLabel(nextCal.startAt)}
                  </p>
                </div>
                <CalendarDays size={16} className="shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </div>
          </div>
        </StaggerItem>
      )}

      <StaggerItem>
        <HomeScreenWidgets
          dash={dash}
          isLoading={isLoading}
          widgets={widgets}
          showChat={showChat}
          firstName={firstName}
        />
      </StaggerItem>

      {showChat && (
        <StaggerItem>
          <ChatWidget />
        </StaggerItem>
      )}

      <StaggerItem>
        <AceStrip />
      </StaggerItem>
    </StaggerList>
  );
}
