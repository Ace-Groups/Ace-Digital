import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/design";
import { CalendarClock } from "lucide-react";
import { formatCurrency, statusColor, cn } from "@/lib/utils";
import { QueryErrorBanner } from "./QueryErrorBanner";
import type { PayrollRun } from "@workspace/api-client-react";

interface FinancePayrollTabProps {
  payrollRuns?: PayrollRun[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function FinancePayrollTab({ payrollRuns, isLoading, isError, onRetry }: FinancePayrollTabProps) {
  if (isError) {
    return <QueryErrorBanner message="Could not load payroll runs." onRetry={onRetry} />;
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!payrollRuns?.length) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No payroll runs"
        description="Run payroll for a month to create a batch from current employee salaries."
      />
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {payrollRuns.map((r) => (
          <Card key={r.id} data-testid={`payroll-card-${r.id}`}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  {new Date(r.year, r.month - 1).toLocaleDateString("en-IN", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "—"}
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="font-semibold tabular-nums">{formatCurrency(r.totalAmount ?? 0)}</p>
                <Badge variant="outline" className={cn("text-xs", statusColor(r.status ?? ""))}>
                  {r.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total Amount</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payrollRuns.map((r) => (
                  <tr key={r.id} data-testid={`payroll-row-${r.id}`} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">
                      {new Date(r.year, r.month - 1).toLocaleDateString("en-IN", {
                        month: "long",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(r.totalAmount ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className={cn("text-xs", statusColor(r.status ?? ""))}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
