import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/design";
import { Users } from "lucide-react";
import { formatCurrency, statusColor, cn } from "@/lib/utils";
import { QueryErrorBanner } from "./QueryErrorBanner";
import type { SalaryRecord, SalaryPostingRecord } from "@workspace/api-client-react";

interface FinanceSalariesTabProps {
  salaries?: SalaryRecord[];
  postings?: SalaryPostingRecord[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
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
              <Card key={s.userId} data-testid={`salary-card-${s.userId}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{s.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.jobTitle ?? "—"} · {s.teamName ?? "—"}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn("text-xs shrink-0", statusColor(s.payrollStatus ?? ""))}>
                      {s.payrollStatus}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Base</p>
                      <p className="font-medium">{formatCurrency(s.baseSalary ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bonus</p>
                      <p className="font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(s.bonus ?? 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-semibold">{formatCurrency(s.totalPay ?? 0)}</p>
                    </div>
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
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Team</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Job Title</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Base</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Bonus</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {salaries?.map((s) => (
                      <tr key={s.userId} data-testid={`salary-row-${s.userId}`} className="hover:bg-muted/40">
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
              <Card key={p.id} data-testid={`salary-posting-${p.id}`}>
                <CardContent className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{p.fullName}</p>
                      <Badge variant="secondary" className="text-xs">
                        {p.allocationType === "MONTHLY" ? "Monthly" : "Project"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {periodLabel(p.month, p.year)}
                      {p.projectName ? ` · ${p.projectName}` : ""}
                    </p>
                  </div>
                  <p className="text-base font-semibold tabular-nums">{formatCurrency(p.totalPay)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
