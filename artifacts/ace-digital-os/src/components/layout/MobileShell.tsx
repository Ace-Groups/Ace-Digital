import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  ClipboardCheck,
  Users,
  MoreHorizontal,
  Bell,
  Settings,
  UserCircle,
  DollarSign,
  Building2,
  Ticket,
  BarChart3,
  MessageSquare,
  Activity,
  CalendarDays,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getListNotificationsQueryKey, useListNotifications } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/design";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HeaderRefreshButton } from "@/components/layout/HeaderRefreshButton";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import { getMobileNavItems } from "@/lib/mobile-nav";
import type { NavRoute } from "@workspace/rbac";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ProfileDialog } from "@/components/ProfileDialog";
import { UserAvatar } from "@/components/UserAvatar";
import { useMobileChrome } from "@/contexts/MobileChromeContext";
import aceLogo from "@/assets/ace-logo.png";

const ICONS: Record<NavRoute, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  projects: FolderKanban,
  tasks: CheckSquare,
  employees: Users,
  finance: DollarSign,
  clients: Building2,
  service: Ticket,
  approvals: ClipboardCheck,
  reports: BarChart3,
  channels: MessageSquare,
  calendar: CalendarDays,
  activity: Activity,
};

interface MobileShellProps {
  children: ReactNode;
  title?: string;
  fillViewport?: boolean;
}

export function MobileShell({ children, title, fillViewport }: MobileShellProps) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { data: notifications } = useListNotifications({
    query: {
      queryKey: getListNotificationsQueryKey(),
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });
  const unread = notifications?.filter((n) => !n.read).length ?? 0;
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const { primary, overflow } = getMobileNavItems(user?.role ?? "");
  const { hideBottomNav, immersivePage } = useMobileChrome();

  function isActive(href: string) {
    if (href === "/") return location === "/";
    return location === href || location.startsWith(`${href}/`);
  }

  const showAppHeader = !immersivePage || Boolean(title?.trim());

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      {showAppHeader && (
      <header className="sticky top-0 z-40 flex shrink-0 items-center gap-2 border-b border-border/80 bg-card/95 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md sm:gap-3 sm:px-4">
        <img src={aceLogo} alt="" className="h-8 w-8 bg-transparent object-contain" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Ace Digital
          </p>
          {title && (
            <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
          )}
        </div>
        <SyncStatusIndicator />
        <ThemeToggle className="h-11 w-11" />
        <HeaderRefreshButton variant="mobile" />
        <button
          type="button"
          onClick={() => setLocation("/notifications")}
          className="relative flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground active:bg-muted"
          aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
        >
          <Bell size={20} />
          {unread > 0 && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-xl active:bg-muted"
          aria-label="Profile"
        >
          <UserAvatar
            avatarUrl={user?.avatarUrl}
            fullName={user?.fullName}
            className="h-8 w-8"
            fallbackClassName="bg-primary text-xs text-primary-foreground"
            iconSize={16}
          />
        </button>
      </header>
      )}

      <main
        className={cn(
          "min-h-0 flex-1 overscroll-contain",
          fillViewport || immersivePage
            ? "flex flex-col overflow-hidden p-0"
            : "overflow-y-auto px-4 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]",
        )}
      >
        {fillViewport || immersivePage ? children : <PageTransition>{children}</PageTransition>}
      </main>

      {!hideBottomNav && (
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-card/95 backdrop-blur-lg"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-stretch justify-around px-1">
          {primary.map((item) => {
            const Icon = ICONS[item.route];
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 text-[9px] font-medium transition-colors sm:text-[10px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                <span className="max-w-[3.25rem] truncate sm:max-w-[4.5rem]">{item.label}</span>
              </Link>
            );
          })}
          {overflow.length > 0 && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                "flex min-w-[4rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-medium",
                overflow.some((o) => isActive(o.href))
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            >
              <MoreHorizontal size={22} strokeWidth={1.75} aria-hidden />
              <span>More</span>
            </button>
          )}
        </div>
      </nav>
      )}

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <ul className="mt-4 space-y-1">
            {overflow.map((item) => {
              const Icon = ICONS[item.route];
              return (
                <li key={item.href}>
                  <button
                    type="button"
                    onClick={() => {
                      setLocation(item.href);
                      setMoreOpen(false);
                    }}
                    className="flex w-full min-h-[48px] items-center gap-3 rounded-xl px-3 text-left text-sm font-medium active:bg-muted"
                  >
                    <Icon size={20} className="text-primary" aria-hidden />
                    {item.label}
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() => {
                  setLocation("/settings");
                  setMoreOpen(false);
                }}
                className="flex w-full min-h-[48px] items-center gap-3 rounded-xl px-3 text-left text-sm font-medium active:bg-muted"
              >
                <Settings size={20} className="text-primary" aria-hidden />
                Settings
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  void logout();
                }}
                className="flex w-full min-h-[48px] items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-destructive active:bg-destructive/10"
              >
                <UserCircle size={20} aria-hidden />
                Sign out
              </button>
            </li>
          </ul>
        </SheetContent>
      </Sheet>

      <ProfileDialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
    </div>
  );
}
