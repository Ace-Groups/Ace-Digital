import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "./Sidebar";
import { Bell, Search } from "lucide-react";
import {
  getListNotificationsQueryKey,
  useListNotifications,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/design";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HeaderRefreshButton } from "@/components/layout/HeaderRefreshButton";
import { SyncStatusIndicator } from "./SyncStatusIndicator";

interface DesktopShellProps {
  children: ReactNode;
  title?: string;
  fillViewport?: boolean;
}

export function DesktopShell({ children, title, fillViewport }: DesktopShellProps) {
  const [, setLocation] = useLocation();
  const { data: notifications } = useListNotifications({
    query: {
      queryKey: getListNotificationsQueryKey(),
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });
  const unread = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <div className="flex h-[100dvh] overflow-hidden v2-ambient-bg">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex shrink-0 items-center gap-4 px-4 py-3 sm:px-6 sm:py-3.5 glass-header border-b border-border/40">
          {title && (
            <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
          )}
          <div className="flex-1" />
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
              className="flex h-10 w-56 items-center gap-2 rounded-2xl border border-border/60 bg-card/60 pl-3.5 pr-2 text-left text-xs text-muted-foreground shadow-v2-xs hover:bg-card/90 hover:border-primary/20 lg:w-80 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/25 v2-input-glow"
            >
              <Search size={14} className="text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">Search or run commands…</span>
              <kbd className="pointer-events-none select-none rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[9px] font-semibold text-muted-foreground flex items-center gap-0.5 shadow-sm">
                <span>⌘</span>K
              </kbd>
            </button>
          </div>
          <SyncStatusIndicator />
          <ThemeToggle />
          <HeaderRefreshButton variant="desktop" />
          <button
            type="button"
            data-testid="btn-notifications"
            onClick={() => setLocation("/notifications")}
            className={cn(
              "relative rounded-lg p-2.5 text-muted-foreground transition-colors duration-300",
              "hover:bg-muted hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
            aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
        </header>
        <main
          className={cn(
            "min-h-0 flex-1",
            fillViewport
              ? "flex flex-col overflow-hidden"
              : "overflow-y-auto p-4 sm:p-6",
          )}
        >
          {fillViewport ? (
            children
          ) : (
            <PageTransition className="mx-auto max-w-[1600px]">{children}</PageTransition>
          )}
        </main>
      </div>
    </div>
  );
}
