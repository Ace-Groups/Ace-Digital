import { useState, useMemo, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "./Sidebar";
import { Bell, Search } from "lucide-react";
import {
  getListNotificationsQueryKey,
  useListNotifications,
  useListProjects,
  useListEmployees,
  useListClients,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
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

  const { data: projects } = useListProjects();
  const { data: employees } = useListEmployees({});
  const { data: clients } = useListClients();

  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const matches: Array<{
      type: "project" | "employee" | "client";
      id: number;
      title: string;
      subtitle: string;
      route: string;
    }> = [];

    // Search projects
    if (projects) {
      projects.forEach((p) => {
        if (p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))) {
          matches.push({
            type: "project",
            id: p.id,
            title: p.name,
            subtitle: `Project · ${p.status.replace("_", " ")}`,
            route: `/projects?projectId=${p.id}`,
          });
        }
      });
    }

    // Search employees
    if (employees) {
      employees.forEach((e) => {
        if (e.fullName.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || (e.jobTitle && e.jobTitle.toLowerCase().includes(q))) {
          matches.push({
            type: "employee",
            id: e.id,
            title: e.fullName,
            subtitle: `Employee · ${e.jobTitle ?? "—"}`,
            route: `/employees`,
          });
        }
      });
    }

    // Search clients
    if (clients) {
      clients.forEach((c) => {
        if (c.companyName.toLowerCase().includes(q) || c.contactName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)) {
          matches.push({
            type: "client",
            id: c.id,
            title: c.companyName,
            subtitle: `Client · ${c.contactName}`,
            route: `/clients`,
          });
        }
      });
    }

    return matches.slice(0, 8);
  }, [searchQuery, projects, employees, clients]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background brand-gradient-subtle">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex shrink-0 items-center gap-4 px-4 py-3 sm:px-6 sm:py-3.5 glass-header">
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                setTimeout(() => setIsFocused(false), 200);
              }}
              className="h-9 w-56 border-border/80 bg-muted/40 pl-9 text-sm focus-visible:ring-primary/30 lg:w-72"
            />
            {isFocused && searchQuery.trim() && (
              <div className="absolute right-0 top-full mt-1.5 w-[320px] rounded-xl border border-border bg-popover/90 dark:bg-card/90 backdrop-blur-md p-1.5 shadow-brand-md z-50">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Search Results ({searchResults.length})
                </div>
                {searchResults.length === 0 ? (
                  <div className="px-2.5 py-3 text-xs text-muted-foreground text-center">
                    No matching results found
                  </div>
                ) : (
                  <div className="mt-1 space-y-0.5 max-h-[280px] overflow-y-auto">
                    {searchResults.map((res, i) => (
                      <button
                        key={`${res.type}-${res.id}-${i}`}
                        type="button"
                        onClick={() => {
                          setLocation(res.route);
                          setSearchQuery("");
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs hover:bg-muted transition-colors cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate text-foreground">{res.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{res.subtitle}</p>
                        </div>
                        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground ml-2">
                          {res.type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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
