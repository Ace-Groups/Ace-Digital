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
  Menu,
  StickyNote,
  Search,
  Users2,
} from "lucide-react";
import { useState, useEffect } from "react";
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
import { hapticLight } from "@/lib/haptics";
import { MobileSpeedDial } from "./MobileSpeedDial";

const ICONS: Record<NavRoute, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  projects: FolderKanban,
  tasks: CheckSquare,
  teams: Users2,
  employees: Users,
  finance: DollarSign,
  clients: Building2,
  service: Ticket,
  approvals: ClipboardCheck,
  reports: BarChart3,
  channels: MessageSquare,
  calendar: CalendarDays,
  activity: Activity,
  notes: StickyNote,
};

interface MobileShellProps {
  children: ReactNode;
  title?: string;
  fillViewport?: boolean;
}

export function MobileShell({ children, title, fillViewport }: MobileShellProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
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

  // Dual pulse taptic feedback when layout sheet/drawer or profile dialog pops into focus
  useEffect(() => {
    if (moreOpen || profileOpen) {
      if (typeof window !== "undefined" && navigator.vibrate) {
        navigator.vibrate([20, 30, 20]);
      }
    }
  }, [moreOpen, profileOpen]);

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
          onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground active:bg-muted"
          aria-label="Search"
        >
          <Search size={20} />
        </button>
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
            : "overflow-y-auto px-4 py-4",
        )}
      >
        {fillViewport || immersivePage ? children : <PageTransition>{children}</PageTransition>}
      </main>

      {!hideBottomNav && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 flex h-[calc(4rem+env(safe-area-inset-bottom))] items-center justify-center px-4 pb-[env(safe-area-inset-bottom)]"
          aria-label="Main navigation"
        >
          <div className="flex h-16 w-full max-w-sm items-stretch justify-around rounded-3xl border border-white/20 bg-background/60 shadow-brand-xl backdrop-blur-xl dark:bg-black/60 px-1">
            {primary.map((item) => {
              const Icon = ICONS[item.route];
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => hapticLight()}
                  className={cn(
                    "flex min-w-[4rem] flex-1 flex-col items-center justify-center gap-1 rounded-2xl transition-all touch-manipulation",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  <Icon size={24} strokeWidth={active ? 2.5 : 1.75} aria-hidden />
                  {active && <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-primary" />}
                </Link>
              );
            })}
            {overflow.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setMoreOpen(true);
                }}
                className={cn(
                  "flex min-w-[4rem] flex-1 flex-col items-center justify-center gap-1 rounded-2xl transition-all touch-manipulation",
                  overflow.some((o) => isActive(o.href))
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <MoreHorizontal size={24} strokeWidth={1.75} aria-hidden />
              </button>
            )}
          </div>
        </nav>
      )}

      {!hideBottomNav && <MobileSpeedDial />}

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
