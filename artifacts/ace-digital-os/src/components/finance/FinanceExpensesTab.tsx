import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/design";
import { Receipt, Check, AlertCircle } from "lucide-react";
import { formatCurrency, statusColor, cn } from "@/lib/utils";
import { QueryErrorBanner } from "./QueryErrorBanner";
import type { Expense } from "@workspace/api-client-react";
import { motion, useMotionValue, useTransform } from "framer-motion";

interface FinanceExpensesTabProps {
  expenses?: Expense[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  canApprove?: boolean;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}

function ExpenseSwipableCard({
  expense,
  canSwipe,
  onApprove,
  onReject,
}: {
  expense: Expense;
  canSwipe: boolean;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}) {
  const x = useMotionValue(0);

  // Smooth opacity transformations based on drag direction & position
  const rightOpacity = useTransform(x, [0, 80], [0, 1]);
  const leftOpacity = useTransform(x, [-80, 0], [1, 0]);

  const handleDragEnd = (_event: any, info: any) => {
    if (!canSwipe) return;
    if (info.offset.x > 100) {
      onApprove(expense.id);
      if (typeof window !== "undefined" && navigator.vibrate) {
        navigator.vibrate([40]);
      }
    } else if (info.offset.x < -100) {
      onReject(expense.id);
      if (typeof window !== "undefined" && navigator.vibrate) {
        navigator.vibrate([40]);
      }
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-muted/10">
      {/* Background action fields (underlays) */}
      {canSwipe && (
        <div className="absolute inset-0 z-0 pointer-events-none rounded-xl">
          {/* Right drag underlay (Approve - Neon Cyan gradient) */}
          <motion.div
            style={{ opacity: rightOpacity }}
            className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-cyan-500/5 to-transparent flex items-center justify-start pl-6"
          >
            <div className="flex items-center gap-2 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
              <Check className="h-5 w-5 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider">Approve</span>
            </div>
          </motion.div>
          {/* Left drag underlay (Reject - Neon Rose gradient) */}
          <motion.div
            style={{ opacity: leftOpacity }}
            className="absolute inset-0 bg-gradient-to-l from-rose-500/20 via-rose-500/5 to-transparent flex items-center justify-end pr-6"
          >
            <div className="flex items-center gap-2 text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]">
              <span className="text-xs font-semibold uppercase tracking-wider">Reject</span>
              <AlertCircle className="h-5 w-5 animate-pulse" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Foreground card */}
      <motion.div
        drag={canSwipe ? "x" : false}
        dragConstraints={{ left: -150, right: 150 }}
        dragElastic={0.2}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className={cn(
          "relative z-10 bg-card rounded-xl border border-transparent shadow-sm select-none",
          canSwipe && "cursor-grab active:cursor-grabbing"
        )}
      >
        <Card>
          <CardContent className="p-4 space-y-3" data-testid={`expense-card-${expense.id}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{expense.description}</p>
                <p className="text-xs text-muted-foreground">
                  {expense.teamName ?? "—"} · {expense.submitterName ?? "—"}
                </p>
              </div>
              <Badge variant="outline" className={cn("text-xs shrink-0", statusColor(expense.status ?? ""))}>
                {expense.status}
              </Badge>
            </div>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(expense.amount ?? 0)}</p>
            {canSwipe && (
              <div className="flex justify-between items-center text-[10px] text-muted-foreground/60 pt-2 border-t border-border/40">
                <span>Swipe Right to Approve</span>
                <span>Swipe Left to Reject</span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
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
        {expenses.map((e) => {
          const isPending = e.status === "PENDING";
          const canSwipe = !!canApprove && isPending;
          return (
            <ExpenseSwipableCard
              key={e.id}
              expense={e}
              canSwipe={canSwipe}
              onApprove={onApprove}
              onReject={onReject}
            />
          );
        })}
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
