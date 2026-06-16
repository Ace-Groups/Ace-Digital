import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Bell,
  CalendarDays,
  CheckSquare,
  MessageSquare,
  Sparkles,
  StickyNote,
  Zap,
  LayoutGrid,
  Smartphone,
} from "lucide-react";
import type { DashboardData } from "@workspace/api-client-react";
import {
  getListChannelsQueryKey,
  getListNotificationsQueryKey,
  useListChannels,
  useListNotifications,
} from "@workspace/api-client-react";
import { useStandaloneMode } from "@/hooks/use-standalone-mode";
import { useAceAssistant } from "@/contexts/AceAssistantContext";
import { formatUnreadBadge } from "@/lib/chat-display";
import { formatScheduleLabel } from "@/lib/calendar-core";
import { cn } from "@/lib/utils";
import "@/styles/home-widgets.css";

const SHORTCUTS = [
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/channels", label: "Chat", icon: MessageSquare },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/notes", label: "Notes", icon: StickyNote },
] as const;

type HomeScreenWidgetsProps = {
  dash?: DashboardData;
  isLoading: boolean;
  widgets: Set<string>;
  showChat: boolean;
  firstName: string;
};

function ProductivityRing({ score }: { score: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="home-widget-ring" aria-hidden>
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle className="home-widget-ring-track" cx="22" cy="22" r={radius} />
        <circle
          className="home-widget-ring-fill"
          cx="22"
          cy="22"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
    </div>
  );
}

export function HomeScreenWidgets({
  dash,
  isLoading,
  widgets,
  showChat,
  firstName,
}: HomeScreenWidgetsProps) {
  const isStandalone = useStandaloneMode();
  const { setOpen: openAce } = useAceAssistant();
  const [timeStr, setTimeStr] = useState("");
  const [period, setPeriod] = useState("");

  const { data: notifications } = useListNotifications({
    query: {
      queryKey: getListNotificationsQueryKey(),
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  });
  const { data: channels } = useListChannels({
    query: {
      queryKey: getListChannelsQueryKey(),
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      );
      const h = now.getHours();
      setPeriod(h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening");
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const notifUnread = notifications?.filter((n) => !n.read).length ?? 0;
  const chatUnread = (channels ?? []).reduce((n, c) => n + (c.unreadCount ?? 0), 0);
  const openTasks = dash?.myOpenTasksCount ?? 0;
  const pendingApprovals = dash?.pendingApprovalsCount ?? 0;

  const nextEvent = useMemo(() => {
    const cal = dash?.upcomingCalendar?.[0];
    if (cal) {
      return {
        label: cal.title,
        meta: formatScheduleLabel(cal.startAt),
        href: "/calendar",
      };
    }
    const deadline = dash?.upcomingDeadlines?.[0];
    if (deadline) {
      return {
        label: deadline.name,
        meta: deadline.deadline
          ? `Due ${new Date(deadline.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
          : "Upcoming deadline",
        href: "/projects",
      };
    }
    return null;
  }, [dash]);

  const productivityScore = useMemo(() => {
    if (isLoading) return 72;
    const inbox = notifUnread + chatUnread;
    const load = openTasks + pendingApprovals;
    const score = Math.max(18, Math.min(98, 100 - load * 6 - inbox * 3));
    return Math.round(score);
  }, [isLoading, notifUnread, chatUnread, openTasks, pendingApprovals]);

  const visibleShortcuts = SHORTCUTS.filter(
    (s) => s.href !== "/channels" || showChat,
  );

  return (
    <section className="home-widgets" aria-label="Home screen widgets">
      <div className="home-widgets-header">
        <div className="home-widgets-title">
          <LayoutGrid className="h-4 w-4 text-primary" aria-hidden />
          <span>Home widgets</span>
        </div>
        {isStandalone ? (
          <span className="home-widgets-installed-badge">
            <Smartphone className="h-3 w-3" aria-hidden />
            Installed
          </span>
        ) : (
          <span className="home-widgets-hint hidden sm:block">
            Install the app to pin shortcuts on your home screen
          </span>
        )}
      </div>

      {isStandalone && (
        <div className="home-shortcut-dock" aria-label="Quick shortcuts">
          {visibleShortcuts.map((shortcut) => {
            const Icon = shortcut.icon;
            return (
              <Link key={shortcut.href} href={shortcut.href} className="home-shortcut-pill">
                <Icon size={16} aria-hidden />
                {shortcut.label}
              </Link>
            );
          })}
          <button
            type="button"
            className="home-shortcut-pill"
            onClick={() => openAce(true)}
          >
            <Sparkles size={16} aria-hidden />
            Ask Ace
          </button>
        </div>
      )}

      <div className="home-widgets-bento">
        <Link href="/" className="home-widget-tile home-widget-tile--span-2 home-widget-tile--hero">
          <div className="home-widget-glow" aria-hidden />
          <ProductivityRing score={productivityScore} />
          <div>
            <p className="home-widget-label">{period} pulse</p>
            <p className="home-widget-hero-time">{timeStr || "—"}</p>
            <p className="home-widget-sub">
              {firstName}, you&apos;re at {productivityScore}% focus capacity today.
            </p>
          </div>
        </Link>

        {(widgets.has("myOpenTasks") || openTasks > 0) && (
          <Link href="/tasks" className="home-widget-tile home-widget-tile--tasks">
            <div className="home-widget-icon-wrap">
              <CheckSquare size={18} aria-hidden />
            </div>
            <div>
              <p className="home-widget-label">Open tasks</p>
              <p className="home-widget-value">{isLoading ? "…" : openTasks}</p>
            </div>
          </Link>
        )}

        {showChat && (
          <Link href="/channels" className="home-widget-tile home-widget-tile--chat">
            {chatUnread > 0 && (
              <span className="home-widget-badge">{formatUnreadBadge(chatUnread)}</span>
            )}
            <div className="home-widget-icon-wrap">
              <MessageSquare size={18} aria-hidden />
            </div>
            <div>
              <p className="home-widget-label">Messages</p>
              <p className="home-widget-value">{isLoading ? "…" : chatUnread}</p>
              <p className="home-widget-sub">Unread in channels</p>
            </div>
          </Link>
        )}

        <Link href="/notifications" className="home-widget-tile home-widget-tile--alerts">
          {notifUnread > 0 && (
            <span className="home-widget-badge">{formatUnreadBadge(notifUnread)}</span>
          )}
          <div className="home-widget-icon-wrap">
            <Bell size={18} aria-hidden />
          </div>
          <div>
            <p className="home-widget-label">Alerts</p>
            <p className="home-widget-value">{notifUnread}</p>
            <p className="home-widget-sub">Notifications waiting</p>
          </div>
        </Link>

        {nextEvent && (
          <Link href={nextEvent.href} className="home-widget-tile home-widget-tile--next home-widget-tile--span-2">
            <div className="home-widget-icon-wrap">
              <CalendarDays size={18} aria-hidden />
            </div>
            <div>
              <p className="home-widget-label">Next up</p>
              <p className={cn("home-widget-sub", "!text-sm !font-semibold !text-foreground")}>
                {nextEvent.label}
              </p>
              <p className="home-widget-sub">{nextEvent.meta}</p>
            </div>
          </Link>
        )}

        <Link href="/notes" className="home-widget-tile home-widget-tile--notes">
          <div className="home-widget-icon-wrap">
            <StickyNote size={18} aria-hidden />
          </div>
          <div>
            <p className="home-widget-label">Notes</p>
            <p className="home-widget-sub">Capture an idea</p>
          </div>
        </Link>

        {widgets.has("pendingApprovals") && pendingApprovals > 0 && (
          <Link href="/approvals" className="home-widget-tile">
            <span className="home-widget-badge">{pendingApprovals}</span>
            <div className="home-widget-icon-wrap">
              <Zap size={18} aria-hidden />
            </div>
            <div>
              <p className="home-widget-label">Approvals</p>
              <p className="home-widget-value">{pendingApprovals}</p>
            </div>
          </Link>
        )}

        <button
          type="button"
          className="home-widget-tile home-widget-tile--ace text-left"
          onClick={() => openAce(true)}
        >
          <div className="home-widget-icon-wrap">
            <Sparkles size={18} aria-hidden />
          </div>
          <div>
            <p className="home-widget-label">Ask Ace</p>
            <p className="home-widget-sub">AI command center</p>
          </div>
        </button>
      </div>

      {isStandalone && (
        <p className="home-widgets-hint">
          Long-press the Ace Digital icon on your home screen for instant shortcuts to Tasks, Chat, Calendar, and Notes.
        </p>
      )}
    </section>
  );
}
