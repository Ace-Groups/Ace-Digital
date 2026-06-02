import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Bell, Search } from "lucide-react";
import { useListNotifications } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/design";
import { ThemeToggle } from "@/components/ThemeToggle";

interface DesktopShellProps {
  children: ReactNode;
  title?: string;
}

export function DesktopShell({ children, title }: DesktopShellProps) {
  const { data: notifications } = useListNotifications();
  const unread = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <div className="flex min-h-[100dvh] overflow-hidden bg-background brand-gradient-subtle">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-4 border-b border-border/80 bg-card/90 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-3.5">
          {title && (
            <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
          )}
          <div className="flex-1" />
          <div className="relative hidden sm:block">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              data-testid="global-search"
              type="search"
              placeholder="Search projects, people, clients…"
              className="h-9 w-56 border-border/80 bg-muted/40 pl-9 text-sm focus-visible:ring-primary/30 lg:w-72"
            />
          </div>
          <ThemeToggle />
          <button
            type="button"
            data-testid="btn-notifications"
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <PageTransition className="mx-auto max-w-[1600px]">{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
