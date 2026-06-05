import { StatCard } from "@/components/ui/stat-card";
import {
  FolderKanban, Users, DollarSign, ClipboardCheck, Building2, CheckSquare, Ticket,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { DashboardData } from "@workspace/api-client-react";

interface DashboardStatCardsProps {
  widgets: Set<string>;
  dash?: DashboardData;
  isLoading: boolean;
}

export function DashboardStatCards({ widgets, dash, isLoading }: DashboardStatCardsProps) {
  return (
    <>
      {widgets.has("activeProjects") && (
        <StatCard
          label="Active Projects"
          value={dash?.activeProjectsCount ?? 0}
          icon={FolderKanban}
          tone="brand"
          href="/projects"
          isLoading={isLoading && !dash}
          testId="stat-active-projects"
        />
      )}
      {widgets.has("myOpenTasks") && (
        <StatCard
          label="My Open Tasks"
          value={dash?.myOpenTasksCount ?? 0}
          icon={CheckSquare}
          tone="brand"
          href="/tasks"
          isLoading={isLoading && !dash}
          testId="stat-my-tasks"
        />
      )}
      {widgets.has("employeeCount") && (
        <StatCard
          label="Total Employees"
          value={dash?.employeeCount ?? 0}
          icon={Users}
          tone="success"
          href="/employees"
          isLoading={isLoading && !dash}
          testId="stat-total-employees"
        />
      )}
      {widgets.has("activeClients") && (
        <StatCard
          label="Active Clients"
          value={dash?.activeClientsCount ?? 0}
          icon={Building2}
          tone="success"
          href="/clients"
          isLoading={isLoading && !dash}
          testId="stat-active-clients"
        />
      )}
      {widgets.has("contractValue") && (
        <StatCard
          label="Contract Value"
          value={formatCurrency(dash?.contractValueTotal ?? 0)}
          icon={DollarSign}
          tone="warning"
          href="/clients"
          isLoading={isLoading && !dash}
          testId="stat-contract-value"
        />
      )}
      {widgets.has("monthlyRevenue") && (
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(dash?.monthlyRevenue ?? 0)}
          icon={DollarSign}
          tone="warning"
          href="/finance"
          isLoading={isLoading && !dash}
          testId="stat-monthly-revenue"
        />
      )}
      {widgets.has("pendingApprovals") && (
        <StatCard
          label="Pending Approvals"
          value={dash?.pendingApprovalsCount ?? 0}
          icon={ClipboardCheck}
          tone="danger"
          href="/approvals"
          isLoading={isLoading && !dash}
          testId="stat-pending-approvals"
        />
      )}
      {widgets.has("overdueServiceFollowUps") && (
        <StatCard
          label="Overdue Follow-ups"
          value={dash?.overdueServiceFollowUpsCount ?? 0}
          icon={Ticket}
          tone="danger"
          href="/service"
          isLoading={isLoading && !dash}
          testId="stat-overdue-service"
        />
      )}
    </>
  );
}
