import { Link, useLocation } from "wouter";
import { getNavRoutesForRole, NAV_ROUTES } from "@workspace/rbac";
import {
  LayoutDashboard, FolderKanban, CheckSquare, Users, DollarSign,
  Building2, ClipboardCheck, BarChart3, MessageSquare, Activity,
  LogOut, ChevronLeft, ChevronRight, UserCircle,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProfileDialog } from "@/components/ProfileDialog";
import { UserAvatar } from "@/components/UserAvatar";
import aceLogo from "@/assets/ace-logo.png";

const NAV_ICONS = {
  dashboard: LayoutDashboard,
  projects: FolderKanban,
  tasks: CheckSquare,
  employees: Users,
  finance: DollarSign,
  clients: Building2,
  approvals: ClipboardCheck,
  reports: BarChart3,
  channels: MessageSquare,
  activity: Activity,
} as const;

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  const allowedRoutes = new Set(getNavRoutesForRole(user?.role ?? ""));
  const navItems = NAV_ROUTES.filter((n) => allowedRoutes.has(n.route)).map((n) => ({
    ...n,
    icon: NAV_ICONS[n.route],
    label: n.route === "employees" && user?.role === "employee" ? "My Profile" : n.label,
  }));

  function handleProfileClose() {
    setProfileOpen(false);
  }

  return (
    <>
      <aside
        data-testid="sidebar"
        data-collapsed={collapsed ? "true" : "false"}
        className={cn(
          "sticky top-0 flex h-[100dvh] shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground shadow-brand-md transition-[width] duration-300 ease-out",
          collapsed ? "w-[4.25rem]" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center border-b border-sidebar-border py-4",
            collapsed ? "flex-col gap-2 px-2" : "gap-2 px-3",
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent/50">
            <img
              src={aceLogo}
              alt="Ace Digital"
              className="h-7 w-7 bg-transparent object-contain"
            />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-sm font-semibold leading-tight text-sidebar-foreground">
                Ace Digital
              </p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/50">
                Operating System
              </p>
            </div>
          )}
          <button
            type="button"
            data-testid="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            className="shrink-0 rounded-md p-1.5 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-x-hidden overflow-y-auto px-2 py-3">
          {navItems.map(({ icon: Icon, label, href }) => {
            const active =
              location === href || (href !== "/" && location.startsWith(href));

            const linkClass = cn(
              "flex items-center rounded-lg text-sm font-medium transition-all duration-200",
              collapsed
                ? "mx-auto h-10 w-10 justify-center p-0"
                : "gap-3 px-3 py-2.5",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            );

            const link = (
              <Link
                href={href}
                data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                className={linkClass}
                aria-label={label}
              >
                <Icon size={18} className="shrink-0" strokeWidth={active ? 2.25 : 2} />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );

            if (!collapsed) {
              return <div key={href}>{link}</div>;
            }

            return (
              <Tooltip key={href} delayDuration={0}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-sidebar-border p-2">
          {collapsed ? (
            <>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    data-testid="btn-profile"
                    onClick={() => setProfileOpen(true)}
                    className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-sidebar-accent"
                    aria-label="Profile"
                  >
                    <UserAvatar
                      avatarUrl={user?.avatarUrl}
                      fullName={user?.fullName}
                      className="h-8 w-8 ring-2 ring-sidebar-primary/50"
                      fallbackClassName="bg-sidebar-primary text-xs text-sidebar-primary-foreground"
                      iconSize={16}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Profile</TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    data-testid="btn-logout"
                    onClick={logout}
                    className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    aria-label="Sign out"
                  >
                    <LogOut size={18} className="shrink-0" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign Out</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <button
                type="button"
                data-testid="btn-profile"
                onClick={() => setProfileOpen(true)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-sidebar-accent"
              >
                <UserAvatar
                  avatarUrl={user?.avatarUrl}
                  fullName={user?.fullName}
                  className="h-8 w-8 ring-2 ring-sidebar-primary/50"
                  fallbackClassName="bg-sidebar-primary text-xs text-sidebar-primary-foreground"
                  iconSize={16}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-tight text-sidebar-foreground">
                    {user?.fullName}
                  </p>
                  <p className="truncate text-xs capitalize text-sidebar-foreground/50">
                    {user?.role?.replace("_", " ")}
                  </p>
                </div>
                <UserCircle size={14} className="shrink-0 text-sidebar-foreground/40" />
              </button>
              <button
                type="button"
                data-testid="btn-logout"
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <LogOut size={16} className="shrink-0" />
                <span>Sign Out</span>
              </button>
            </>
          )}
        </div>
      </aside>

      <ProfileDialog open={profileOpen} onClose={handleProfileClose} />
    </>
  );
}
