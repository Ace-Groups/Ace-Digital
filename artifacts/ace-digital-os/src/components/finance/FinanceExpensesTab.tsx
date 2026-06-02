import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/design";
import { Receipt } from "lucide-react";
import { formatCurrency, statusColor, cn } from "@/lib/utils";
import { QueryErrorBanner } from "./QueryErrorBanner";
import type { Expense } from "@workspace/api-client-react";

interface FinanceExpensesTabProps {
  expenses?: Expense[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  canApprove?: boolean;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}

export function FinanceExpensesTab({
  expenses,
  isLoading,
  isError,
  onRetry,
  canApprove,
  onApprove,
  onReject,
}: FinanceExpensesTabProps) {
  if (isError) {
    return <QueryErrorBanner message="Could not load expenses." onRetry={onRetry} />;
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!expenses?.length) {
    return (
      <EmptyState
        icon={Receipt}
        title="No expenses yet"
        description="Record a business expense to track spending."
      />
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {expenses.map((e) => (
          <Card key={e.id} data-testid={`expense-card-${e.id}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{e.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.teamName ?? "—"} · {e.submitterName ?? "—"}
                  </p>
                </div>
                <Badge variant="outline" className={cn("text-xs shrink-0", statusColor(e.status ?? ""))}>
                  {e.status}
                </Badge>
              </div>
              <p className="text-lg font-semibold tabular-nums">{formatCurrency(e.amount ?? 0)}</p>
              {canApprove && e.status === "PENDING" && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    onClick={() => onApprove(e.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 border-destructive/30 text-destructive"
                    onClick={() => onReject(e.id)}
                  >
                    Reject
                  </Button>
                </div>
              )}
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
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Team</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Submitted By</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                  {canApprove && (
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map((e) => (
                  <tr key={e.id} data-testid={`expense-row-${e.id}`} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">{e.description}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.teamName ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.submitterName ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(e.amount ?? 0)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className={cn("text-xs", statusColor(e.status ?? ""))}>
                        {e.status}
                      </Badge>
                    </td>
                    {canApprove && (
                      <td className="px-4 py-3 text-center">
                        {e.status === "PENDING" ? (
                          <div className="flex justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                              onClick={() => onApprove(e.id)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs border-destructive/30 text-destructive"
                              onClick={() => onReject(e.id)}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    )}
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
