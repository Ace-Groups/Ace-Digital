import { Link } from "wouter";
import { StaggerItem, StaggerList } from "@/components/design";
import { CheckSquare, MessageSquare, CalendarDays } from "lucide-react";
import { DashboardHeroCard } from "./DashboardHeroCard";
import { DashboardStatCards } from "./DashboardStatCards";
import { DashboardSecondaryWidgets } from "./DashboardWidgets";
import { ChatWidget } from "./ChatWidget";
import { useDashboardPage } from "./useDashboardPage";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/channels", label: "Chat", icon: MessageSquare },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
] as const;

export function DashboardMobile() {
  const { dash, isLoading, isFetching, firstName, widgets, dashboardDate, roleLabel, showChat } =
    useDashboardPage();

  return (
    <StaggerList className="page-stack">
      <StaggerItem>
        <DashboardHeroCard />
      </StaggerItem>

      <StaggerItem>
        <div className="mobile-stat-scroll flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          <div className="flex min-w-max gap-3">
            <DashboardStatCards widgets={widgets} dash={dash} isLoading={isLoading} />
          </div>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            if (action.href === "/channels" && !showChat) return null;
            return (
              <Link key={action.href} href={action.href}>
                <span className={cn(
                  "inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium shadow-sm",
                )}>
                  <Icon size={16} className="text-primary" />
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>
      </StaggerItem>

      {showChat && (
        <StaggerItem><ChatWidget /></StaggerItem>
      )}

      <StaggerItem>
        <div className="space-y-4">
          <DashboardSecondaryWidgets widgets={widgets} dash={dash} isLoading={isLoading} />
        </div>
      </StaggerItem>
    </StaggerList>
  );
}
