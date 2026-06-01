import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, FolderKanban, CheckSquare, Users, DollarSign,
  Building2, ClipboardCheck, BarChart3, MessageSquare, Activity,
  LogOut, ChevronLeft, ChevronRight, UserCircle,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProfileDialog, getStoredAvatar } from "@/components/ProfileDialog";
import aceLogo from "@assets/ace_logo_1780335102216.png";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: FolderKanban, label: "Projects", href: "/projects" },
  { icon: CheckSquare, label: "Tasks", href: "/tasks" },
  { icon: Users, label: "Employees", href: "/employees" },
  { icon: DollarSign, label: "Finance", href: "/finance" },
  { icon: Building2, label: "Clients", href: "/clients" },
  { icon: ClipboardCheck, label: "Approvals", href: "/approvals" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
  { icon: MessageSquare, label: "Channels", href: "/channels" },
  { icon: Activity, label: "Activity", href: "/activity" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarKey, setAvatarKey] = useState(0);

  const initials = getInitials(user?.fullName ?? "?");
  const storedAvatar = getStoredAvatar();

  function handleProfileClose() {
    setProfileOpen(false);
    setAvatarKey((k) => k + 1);
  }

  return (
    <>
      <aside
        data-testid="sidebar"
        className={cn(
          "flex h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground shadow-brand-md transition-[width] duration-300 ease-out",
          collapsed ? "w-[4.25rem]" : "w-64"
        )}
      >
        <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent/50">
            <img
              src={aceLogo}
              alt="Ace Digital"
              className="h-7 w-7 object-contain"
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

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
            const active =
              location === href || (href !== "/" && location.startsWith(href));
            return (
              <Tooltip key={href} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    data-testid={`nav-${label.toLowerCase()}`}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <Icon size={18} className="shrink-0" strokeWidth={active ? 2.25 : 2} />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">{label}</TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-sidebar-border p-2">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                type="button"
                data-testid="btn-profile"
                onClick={() => setProfileOpen(true)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-sidebar-accent",
                  !collapsed && "text-left"
                )}
              >
                {storedAvatar.type === "image" && storedAvatar.value ? (
                  <Avatar className="h-8 w-8 shrink-0 ring-2 ring-sidebar-primary/50">
                    <AvatarImage src={storedAvatar.value} key={avatarKey} className="object-cover" />
                    <AvatarFallback className="bg-sidebar-primary text-xs text-sidebar-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Avatar className="h-8 w-8 shrink-0 ring-2 ring-sidebar-primary/50">
                    <AvatarFallback className="bg-sidebar-primary text-xs text-sidebar-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                )}
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight text-sidebar-foreground">
                      {user?.fullName}
                    </p>
                    <p className="truncate text-xs capitalize text-sidebar-foreground/50">
                      {user?.role?.replace("_", " ")}
                    </p>
                  </div>
                )}
                {!collapsed && (
                  <UserCircle size={14} className="shrink-0 text-sidebar-foreground/40" />
                )}
              </button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Profile</TooltipContent>}
          </Tooltip>

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                type="button"
                data-testid="btn-logout"
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <LogOut size={16} className="shrink-0" />
                {!collapsed && <span>Sign Out</span>}
              </button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Sign Out</TooltipContent>}
          </Tooltip>
        </div>
      </aside>

      <ProfileDialog open={profileOpen} onClose={handleProfileClose} />
    </>
  );
}
