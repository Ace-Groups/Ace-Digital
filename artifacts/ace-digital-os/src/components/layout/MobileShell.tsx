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
  ShieldCheck,
  GraduationCap,
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
import { AceAiAvatar } from "@/components/ai/AceAiAvatar";
import { useAceAssistant } from "@/contexts/AceAssistantContext";
import { hapticLight } from "@/lib/haptics";


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
  credentials: ShieldCheck,
  interns: GraduationCap,
};

interface MobileShellProps {
  children: ReactNode;
  title?: string;
  fillViewport?: boolean;
}

export function MobileShell({ children, title, fillViewport }: MobileShellProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { setOpen: setAssistantOpen } = useAceAssistant();
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
    <div className="flex h-[100dvh] flex-col overflow-hidden v2-ambient-bg">
      {showAppHeader && (
      <header className="sticky top-0 z-40 flex shrink-0 items-center gap-1.5 border-b border-border/50 bg-card/80 px-2.5 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-xl sm:gap-3 sm:px-4">
        <img src={aceLogo} alt="" className="h-8 w-8 shrink-0 bg-transparent object-contain" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Ace Digital
          </p>
          {title && (
            <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
          )}
        </div>
        <SyncStatusIndicator />
        <ThemeToggle className="h-10 w-10 shrink-0" />
        <HeaderRefreshButton variant="mobile" />
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground active:bg-muted"
          aria-label="Search"
        >
          <Search size={20} />
        </button>
        <button
          type="button"
          onClick={() => setLocation("/notifications")}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground active:bg-muted"
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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl active:bg-muted"
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
          !hideBottomNav && !fillViewport && !immersivePage && "pb-[calc(7.75rem+env(safe-area-inset-bottom))]",
        )}
      >
        {fillViewport || immersivePage ? children : <PageTransition>{children}</PageTransition>}
      </main>

      {!hideBottomNav && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 flex h-[calc(5.35rem+env(safe-area-inset-bottom))] items-center justify-center px-3 pb-[max(0.55rem,env(safe-area-inset-bottom))]"
          aria-label="Main navigation"
        >
          <div className="flex h-[4.35rem] w-full max-w-md items-stretch justify-around rounded-2xl border border-border/50 bg-card/85 px-1.5 shadow-v2-lg backdrop-blur-2xl">
            {primary.map((item) => {
              const Icon = ICONS[item.route];
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => hapticLight()}
                  className={cn(
                    "relative flex min-w-[3.75rem] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium transition-all touch-manipulation",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={21} strokeWidth={active ? 2.4 : 1.8} aria-hidden />
                  <span className="max-w-full truncate">{item.label}</span>
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
                  "relative flex min-w-[3.75rem] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium transition-all touch-manipulation",
                  overflow.some((o) => isActive(o.href))
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
                aria-label="More navigation"
              >
                <MoreHorizontal size={21} strokeWidth={1.8} aria-hidden />
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
                  hapticLight();
                  setAssistantOpen(true);
                  setMoreOpen(false);
                }}
                className="flex w-full min-h-[48px] items-center gap-3 rounded-xl px-3 text-left text-sm font-medium active:bg-muted"
              >
                <AceAiAvatar size="sm" />
                Ask Ace
              </button>
            </li>
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
