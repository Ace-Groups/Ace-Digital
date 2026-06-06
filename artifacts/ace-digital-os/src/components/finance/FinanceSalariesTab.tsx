import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/design";
import { Users, Check, AlertCircle, Eye, Edit2 } from "lucide-react";
import { formatCurrency, statusColor, cn } from "@/lib/utils";
import { QueryErrorBanner } from "./QueryErrorBanner";
import type { SalaryRecord, SalaryPostingRecord } from "@workspace/api-client-react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";

interface FinanceSalariesTabProps {
  salaries?: SalaryRecord[];
  postings?: SalaryPostingRecord[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onSwipeReviewProfile?: (salary: SalaryRecord) => void;
  onSwipeInspectProfile?: (salary: SalaryRecord) => void;
  onSwipeReviewPosting?: (posting: SalaryPostingRecord) => void;
  onSwipeInspectPosting?: (posting: SalaryPostingRecord) => void;
}

interface SalaryProfileSwipableCardProps {
  salary: SalaryRecord;
  onSwipeReview?: (salary: SalaryRecord) => void;
  onSwipeInspect?: (salary: SalaryRecord) => void;
}

function SalaryProfileSwipableCard({
  salary,
  onSwipeReview,
  onSwipeInspect,
}: SalaryProfileSwipableCardProps) {
  const x = useMotionValue(0);
  const rightOpacity = useTransform(x, [0, 80], [0, 1]);
  const leftOpacity = useTransform(x, [-80, 0], [1, 0]);

  const handleDragEnd = (_event: any, info: any) => {
    if (info.offset.x > 80) {
      if (typeof window !== "undefined" && navigator.vibrate) {
        navigator.vibrate([40]);
      }
      onSwipeReview?.(salary);
    } else if (info.offset.x < -80) {
      if (typeof window !== "undefined" && navigator.vibrate) {
        navigator.vibrate([40]);
      }
      onSwipeInspect?.(salary);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-muted/10">
      {/* Background action fields (underlays) */}
      <div className="absolute inset-0 z-0 pointer-events-none rounded-xl">
        <motion.div
          style={{ opacity: rightOpacity }}
          className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-cyan-500/5 to-transparent flex items-center justify-start pl-6"
        >
          <div className="flex items-center gap-2 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
            <Check className="h-5 w-5 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider">Review</span>
          </div>
        </motion.div>
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
        dragConstraints={{ left: -120, right: 120 }}
        dragElastic={0.2}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className="relative z-10 bg-card rounded-xl border border-transparent shadow-sm select-none cursor-grab active:cursor-grabbing"
      >
        <Card>
          <CardContent className="p-4 space-y-2" data-testid={`salary-card-${salary.userId}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{salary.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {salary.jobTitle ?? "—"} · {salary.teamName ?? "—"}
                </p>
              </div>
              <Badge variant="outline" className={cn("text-xs shrink-0", statusColor(salary.payrollStatus ?? ""))}>
                {salary.payrollStatus}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Base</p>
                <p className="font-medium">{formatCurrency(salary.baseSalary ?? 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Bonus</p>
                <p className="font-medium text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(salary.bonus ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="font-semibold">{formatCurrency(salary.totalPay ?? 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

interface SalaryPostingSwipableCardProps {
  posting: SalaryPostingRecord;
  onSwipeReview?: (posting: SalaryPostingRecord) => void;
  onSwipeInspect?: (posting: SalaryPostingRecord) => void;
}

function SalaryPostingSwipableCard({
  posting,
  onSwipeReview,
  onSwipeInspect,
}: SalaryPostingSwipableCardProps) {
  const x = useMotionValue(0);
  const rightOpacity = useTransform(x, [0, 80], [0, 1]);
  const leftOpacity = useTransform(x, [-80, 0], [1, 0]);

  const handleDragEnd = (_event: any, info: any) => {
    if (info.offset.x > 80) {
      if (typeof window !== "undefined" && navigator.vibrate) {
        navigator.vibrate([40]);
      }
      onSwipeReview?.(posting);
    } else if (info.offset.x < -80) {
      if (typeof window !== "undefined" && navigator.vibrate) {
        navigator.vibrate([40]);
      }
      onSwipeInspect?.(posting);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-muted/10">
      {/* Background action fields (underlays) */}
      <div className="absolute inset-0 z-0 pointer-events-none rounded-xl">
        <motion.div
          style={{ opacity: rightOpacity }}
          className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-cyan-500/5 to-transparent flex items-center justify-start pl-6"
        >
          <div className="flex items-center gap-2 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
            <Check className="h-5 w-5 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider">Review</span>
          </div>
        </motion.div>
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
        dragConstraints={{ left: -120, right: 120 }}
        dragElastic={0.2}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className="relative z-10 bg-card rounded-xl border border-transparent shadow-sm select-none cursor-grab active:cursor-grabbing"
      >
        <Card>
          <CardContent className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" data-testid={`salary-posting-${posting.id}`}>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{posting.fullName}</p>
                <Badge variant="secondary" className="text-xs">
                  {posting.allocationType === "MONTHLY" ? "Monthly" : "Project"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {periodLabel(posting.month, posting.year)}
                {posting.projectName ? ` · ${posting.projectName}` : ""}
              </p>
            </div>
            <p className="text-base font-semibold tabular-nums">{formatCurrency(posting.totalPay)}</p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function periodLabel(month: number, year: number) {
  return new Date(year, month - 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export function FinanceSalariesTab({
  salaries,
  postings,
  isLoading,
  isError,
  onRetry,
  onSwipeReviewProfile,
  onSwipeInspectProfile,
  onSwipeReviewPosting,
  onSwipeInspectPosting,
}: FinanceSalariesTabProps) {
  if (isError) {
    return <QueryErrorBanner message="Could not load salaries." onRetry={onRetry} />;
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

  const hasProfiles = (salaries?.length ?? 0) > 0;
  const hasPostings = (postings?.length ?? 0) > 0;

  if (!hasProfiles && !hasPostings) {
    return (
      <EmptyState
          icon={Users}
          title="No salary data yet"
          description="Post a monthly salary or a project allocation to get started."
      />
    );
  }

  return (
    <div className="space-y-6">
      {hasProfiles && (
        <section className="space-y-3">
          <h3 className="text-label text-muted-foreground px-1">Employee profiles</h3>
          <div className="space-y-3 md:hidden">
            {salaries?.map((s) => (
              <SalaryProfileSwipableCard
                key={s.userId}
                salary={s}
                onSwipeReview={onSwipeReviewProfile}
                onSwipeInspect={onSwipeInspectProfile}
              />
            ))}
          </div>
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Team</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Job Title</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Base</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Bonus</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {salaries?.map((s) => (
                      <tr key={s.userId} data-testid={`salary-row-${s.userId}`} className="hover:bg-muted/40 group">
                        <td className="px-4 py-3 font-medium">{s.fullName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{s.teamName ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{s.jobTitle ?? "—"}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(s.baseSalary ?? 0)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(s.bonus ?? 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(s.totalPay ?? 0)}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className={cn("text-xs", statusColor(s.payrollStatus ?? ""))}>
                            {s.payrollStatus}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onSwipeInspectProfile && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Inspect Salary details"
                                onClick={() => onSwipeInspectProfile(s)}
                              >
                                <Eye size={14} />
                              </Button>
                            )}
                            {onSwipeReviewProfile && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary"
                                title="Review and update"
                                onClick={() => onSwipeReviewProfile(s)}
                              >
                                <Edit2 size={14} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {hasPostings && (
        <section className="space-y-3">
          <h3 className="text-label text-muted-foreground px-1">Recent postings</h3>
          <div className="space-y-3">
            {postings?.map((p) => (
              <SalaryPostingSwipableCard
                key={p.id}
                posting={p}
                onSwipeReview={onSwipeReviewPosting}
                onSwipeInspect={onSwipeInspectPosting}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
