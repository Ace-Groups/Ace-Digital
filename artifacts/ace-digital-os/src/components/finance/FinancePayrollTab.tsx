import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/design";
import { CalendarClock, Check, AlertCircle } from "lucide-react";
import { formatCurrency, statusColor, cn } from "@/lib/utils";
import { QueryErrorBanner } from "./QueryErrorBanner";
import type { PayrollRun } from "@workspace/api-client-react";
import { motion, useMotionValue, useTransform } from "framer-motion";

interface FinancePayrollTabProps {
  payrollRuns?: PayrollRun[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

function PayrollSwipableCard({
  run,
}: {
  run: PayrollRun;
}) {
  const x = useMotionValue(0);

  // Smooth opacity transformations based on drag direction & position
  const rightOpacity = useTransform(x, [0, 80], [0, 1]);
  const leftOpacity = useTransform(x, [-80, 0], [1, 0]);

  const handleDragEnd = (_event: any, info: any) => {
    if (Math.abs(info.offset.x) > 100) {
      if (typeof window !== "undefined" && navigator.vibrate) {
        navigator.vibrate([40]);
      }
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-muted/10">
      {/* Background action fields (underlays) */}
      <div className="absolute inset-0 z-0 pointer-events-none rounded-xl">
        {/* Right drag underlay (Review - Neon Cyan gradient) */}
        <motion.div
          style={{ opacity: rightOpacity }}
          className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-cyan-500/5 to-transparent flex items-center justify-start pl-6"
        >
          <div className="flex items-center gap-2 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
            <Check className="h-5 w-5 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider">Review</span>
          </div>
        </motion.div>
        {/* Left drag underlay (Inspect - Neon Rose gradient) */}
        <motion.div
          style={{ opacity: leftOpacity }}
          className="absolute inset-0 bg-gradient-to-l from-rose-500/20 via-rose-500/5 to-transparent flex items-center justify-end pr-6"
        >
          <div className="flex items-center gap-2 text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]">
            <span className="text-xs font-semibold uppercase tracking-wider">Inspect</span>
            <AlertCircle className="h-5 w-5 animate-pulse" />
          </div>
        </motion.div>
      </div>

      {/* Foreground card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -150, right: 150 }}
        dragElastic={0.2}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className="relative z-10 bg-card rounded-xl border border-transparent shadow-sm select-none cursor-grab active:cursor-grabbing"
      >
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-3" data-testid={`payroll-card-${run.id}`}>
            <div>
              <p className="font-medium">
                {new Date(run.year, run.month - 1).toLocaleDateString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {run.createdAt ? new Date(run.createdAt).toLocaleDateString("en-IN") : "—"}
              </p>
            </div>
            <div className="text-right space-y-1">
              <p className="font-semibold tabular-nums">{formatCurrency(run.totalAmount ?? 0)}</p>
              <Badge variant="outline" className={cn("text-xs", statusColor(run.status ?? ""))}>
                {run.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
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
          <PayrollSwipableCard key={r.id} run={r} />
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
