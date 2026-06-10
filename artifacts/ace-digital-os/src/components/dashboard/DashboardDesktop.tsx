import { StaggerItem, StaggerList } from "@/components/design";
import { DashboardHeroCard } from "./DashboardHeroCard";
import { DashboardStatCards } from "./DashboardStatCards";
import { UpcomingDeadlinesWidget, TeamLoadWidget, UpcomingCalendarWidget, RecentActivityWidget, WorkspaceAnalyticsWidget } from "./DashboardWidgets";
import { ChatWidget } from "./ChatWidget";
import { AskAceCard } from "@/components/ai/AskAceCard";
import { HomeScreenWidgets } from "@/components/pwa/HomeScreenWidgets";
import { useDashboardPage } from "./useDashboardPage";

export function DashboardDesktop() {
  const { dash, isLoading, isFetching, firstName, widgets, dashboardDate, roleLabel, showChat } =
    useDashboardPage();

  return (
    <StaggerList className="page-stack">
      <StaggerItem>
        <DashboardHeroCard
          firstName={firstName}
          dashboardDate={dashboardDate}
          roleLabel={roleLabel}
          isFetching={isFetching}
          hasData={Boolean(dash)}
          dash={dash}
        />
      </StaggerItem>

      <StaggerItem>
        <HomeScreenWidgets
          dash={dash}
          isLoading={isLoading}
          widgets={widgets}
          showChat={showChat}
          firstName={firstName}
        />
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          <DashboardStatCards widgets={widgets} dash={dash} isLoading={isLoading} />
        </div>
      </StaggerItem>

      <StaggerItem>
        <AskAceCard />
      </StaggerItem>

      <StaggerItem>
        <WorkspaceAnalyticsWidget dash={dash} isLoading={isLoading} />
      </StaggerItem>

      <StaggerItem>
        <div className="grid gap-4 lg:grid-cols-3 xl:gap-6">
          {showChat && (
            <div className="lg:col-span-1">
              <ChatWidget />
            </div>
          )}
          {widgets.has("upcomingDeadlines") && (
            <div className={showChat ? "lg:col-span-2" : "lg:col-span-3"}>
              <UpcomingDeadlinesWidget dash={dash} isLoading={isLoading} />
            </div>
          )}
          {widgets.has("teamLoad") && (
            <div className={widgets.has("upcomingDeadlines") ? "" : "lg:col-span-3"}>
              <TeamLoadWidget dash={dash} isLoading={isLoading} />
            </div>
          )}
        </div>
      </StaggerItem>

      {widgets.has("upcomingCalendar") && (
        <StaggerItem><UpcomingCalendarWidget dash={dash} isLoading={isLoading} /></StaggerItem>
      )}

      {widgets.has("recentActivity") && (
        <StaggerItem><RecentActivityWidget dash={dash} isLoading={isLoading} /></StaggerItem>
      )}
    </StaggerList>
  );
}
