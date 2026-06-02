import { TrendingUp, TrendingDown, DollarSign, Users } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { StaggerItem, StaggerList } from "@/components/design";
import { formatCurrency } from "@/lib/utils";
import type { FinanceSummary } from "@workspace/api-client-react";

interface FinanceKpiGridProps {
  summary?: FinanceSummary;
  isLoading?: boolean;
}

export function FinanceKpiGrid({ summary, isLoading }: FinanceKpiGridProps) {
  const items = [
    {
      label: "Total Revenue",
      value: formatCurrency(summary?.totalRevenue ?? 0),
      icon: TrendingUp,
      tone: "success" as const,
      testId: "finance-stat-total-revenue",
    },
    {
      label: "Total Expenses",
      value: formatCurrency(summary?.totalExpenses ?? 0),
      icon: TrendingDown,
      tone: "danger" as const,
      testId: "finance-stat-total-expenses",
    },
    {
      label: "Net Profit",
      value: formatCurrency(summary?.netProfit ?? 0),
      icon: DollarSign,
      tone: "brand" as const,
      testId: "finance-stat-net-profit",
    },
    {
      label: "Monthly Payroll",
      value: formatCurrency(summary?.totalPayroll ?? 0),
      icon: Users,
      tone: "warning" as const,
      testId: "finance-stat-monthly-payroll",
    },
  ];

  return (
    <StaggerList className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <StaggerItem key={item.testId}>
          <StatCard
            label={item.label}
            value={item.value}
            icon={item.icon}
            tone={item.tone}
            isLoading={isLoading}
            testId={item.testId}
          />
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
