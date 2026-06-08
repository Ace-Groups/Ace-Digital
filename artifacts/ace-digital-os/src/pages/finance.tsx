import { useMemo, useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StaggerList } from "@/components/design";
import { FinanceKpiGrid } from "@/components/finance/FinanceKpiGrid";
import { FinanceSalariesTab } from "@/components/finance/FinanceSalariesTab";
import { FinanceExpensesTab } from "@/components/finance/FinanceExpensesTab";
import { FinancePayrollTab } from "@/components/finance/FinancePayrollTab";
import { RecordExpenseSheet, type RecordExpenseFormValues } from "@/components/finance/RecordExpenseSheet";
import { PostSalarySheet, type PostSalaryFormValues } from "@/components/finance/PostSalarySheet";
import { RunPayrollSheet, type RunPayrollFormValues } from "@/components/finance/RunPayrollSheet";
import {
  useGetFinanceSummary,
  useGetMyPayslip,
  useListSalaries,
  useListSalaryPostings,
  useListExpenses,
  useListPayrollRuns,
  useCreatePayrollRun,
  useCreateExpense,
  useCreateSalaryPosting,
  usePatchExpenseStatus,
  getListPayrollRunsQueryKey,
  getGetMyPayslipQueryKey,
  getGetFinanceSummaryQueryKey,
  getListSalariesQueryKey,
  getListSalaryPostingsQueryKey,
  getListExpensesQueryKey,
  type SalaryRecord,
  type SalaryPostingRecord,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { statusColor, cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { appendListItem, patchListItem, setList, snapshotList } from "@/lib/optimistic";
import { runOptimistic } from "@/lib/optimistic/run-optimistic";
import type { Expense } from "@workspace/api-client-react";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/contexts/AuthContext";

function parsePeriod(period: string): { month: number; year: number } {
  const [yearStr, monthStr] = period.split("-");
  return { year: Number(yearStr), month: Number(monthStr) };
}

export default function FinancePage() {
  const { can } = usePermissions();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const payslipOnly = can("finance:salaries_self") && !can("finance:summary");
  const canSummary = can("finance:summary");
  const canSalaries = can("finance:salaries_all");
  const canExpenses = can("finance:expenses_read");
  const canWriteExpense = can("finance:expenses_write");
  const canApproveExpense = can("finance:expenses_approve");
  const canPayroll = can("finance:payroll");
  const showSubmitterPicker = canWriteExpense && can("employees:read");

  const queryOpts = { retry: false as const };

  const { data: myPayslip, isLoading: payslipLoading } = useGetMyPayslip({
    query: { enabled: payslipOnly, queryKey: getGetMyPayslipQueryKey(), ...queryOpts },
  });

  const {
    data: summary,
    isLoading: summaryLoading,
  } = useGetFinanceSummary({
    query: { enabled: canSummary, queryKey: getGetFinanceSummaryQueryKey(), ...queryOpts },
  });

  const {
    data: salaries,
    isLoading: salariesLoading,
    isError: salariesError,
    refetch: refetchSalaries,
  } = useListSalaries({
    query: { enabled: canSalaries, queryKey: getListSalariesQueryKey(), ...queryOpts },
  });

  const {
    data: postings,
    isLoading: postingsLoading,
    refetch: refetchPostings,
  } = useListSalaryPostings({
    query: { enabled: canSalaries, queryKey: getListSalaryPostingsQueryKey(), ...queryOpts },
  });

  const {
    data: expenses,
    isLoading: expensesLoading,
    isError: expensesError,
    refetch: refetchExpenses,
  } = useListExpenses({
    query: { enabled: canExpenses, queryKey: getListExpensesQueryKey(), ...queryOpts },
  });

  const {
    data: payrollRuns,
    isLoading: payrollLoading,
    isError: payrollError,
    refetch: refetchPayroll,
  } = useListPayrollRuns({
    query: { enabled: canPayroll, queryKey: getListPayrollRunsQueryKey(), ...queryOpts },
  });

  const createPayrollRun = useCreatePayrollRun();
  const createExpense = useCreateExpense();
  const createSalaryPosting = useCreateSalaryPosting();
  const patchExpenseStatus = usePatchExpenseStatus();

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [preselectedUserId, setPreselectedUserId] = useState<number | undefined>(undefined);

  // Dual pulse taptic feedback when a validation/allocation layer is popped
  useEffect(() => {
    if (expenseOpen || salaryOpen || payrollOpen) {
      if (typeof window !== "undefined" && navigator.vibrate) {
        navigator.vibrate([20, 30, 20]);
      }
    }
  }, [expenseOpen, salaryOpen, payrollOpen]);

  const defaultTab = useMemo(() => {
    if (canSalaries) return "salaries";
    if (canExpenses) return "expenses";
    if (canPayroll) return "payroll";
    return "salaries";
  }, [canSalaries, canExpenses, canPayroll]);

  const [activeTab, setActiveTab] = useState(defaultTab);

  function invalidateFinance() {
    void queryClient.invalidateQueries({ queryKey: getGetFinanceSummaryQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getListSalariesQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getListSalaryPostingsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getListPayrollRunsQueryKey() });
  }

  async function onExpenseSubmit(data: RecordExpenseFormValues) {
    const expensesKey = getListExpensesQueryKey();
    const tempId = -Date.now();
    setExpenseOpen(false);
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<Expense>(queryClient, expensesKey);
          appendListItem(queryClient, expensesKey, {
            id: tempId,
            description: data.description,
            amount: Number(data.amount),
            status: "PENDING",
            submittedById: Number(data.submittedById),
            createdAt: new Date().toISOString(),
          } as Expense);
          return prev;
        },
        rollback: (prev) => setList(queryClient, expensesKey, prev),
        commit: () =>
          createExpense.mutateAsync({
            data: {
              description: data.description,
              amount: Number(data.amount),
              teamId: data.teamId ? Number(data.teamId) : undefined,
              submittedById: Number(data.submittedById),
            },
          }),
        reconcile: () => invalidateFinance(),
      });
      toast({ title: "Expense recorded" });
    } catch (error) {
      toast({
        title: "Failed to record expense",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  async function onSalarySubmit(data: PostSalaryFormValues) {
    const { month, year } = parsePeriod(data.period);
    try {
      await createSalaryPosting.mutateAsync({
        data: {
          userId: Number(data.userId),
          allocationType: data.allocationType,
          month,
          year,
          baseSalary: Number(data.baseSalary),
          bonus: Number(data.bonus || 0),
          projectId:
            data.allocationType === "PROJECT" && data.projectId
              ? Number(data.projectId)
              : undefined,
        },
      });
      invalidateFinance();
      toast({
        title:
          data.allocationType === "MONTHLY"
            ? "Monthly salary posted"
            : "Project allocation recorded",
      });
      setSalaryOpen(false);
    } catch (error) {
      toast({
        title: "Failed to post salary",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  async function onPayrollSubmit(data: RunPayrollFormValues) {
    const { month, year } = parsePeriod(data.period);
    try {
      await createPayrollRun.mutateAsync({ data: { month, year } });
      invalidateFinance();
      toast({ title: "Payroll run created" });
      setPayrollOpen(false);
    } catch (error) {
      toast({
        title: "Failed to run payroll",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  async function handleApproveExpense(id: number) {
    const expensesKey = getListExpensesQueryKey();
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<Expense>(queryClient, expensesKey);
          patchListItem(queryClient, expensesKey, id, (e) => ({ ...e, status: "APPROVED" }));
          return prev;
        },
        rollback: (prev) => setList(queryClient, expensesKey, prev),
        commit: () => patchExpenseStatus.mutateAsync({ id, data: { status: "APPROVED" } }),
        reconcile: () => invalidateFinance(),
      });
      toast({ title: "Expense approved" });
    } catch (error) {
      toast({
        title: "Failed to approve",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  async function handleRejectExpense(id: number) {
    const expensesKey = getListExpensesQueryKey();
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<Expense>(queryClient, expensesKey);
          patchListItem(queryClient, expensesKey, id, (e) => ({ ...e, status: "REJECTED" }));
          return prev;
        },
        rollback: (prev) => setList(queryClient, expensesKey, prev),
        commit: () => patchExpenseStatus.mutateAsync({ id, data: { status: "REJECTED" } }),
        reconcile: () => invalidateFinance(),
      });
      toast({ title: "Expense rejected", variant: "destructive" });
    } catch (error) {
      toast({
        title: "Failed to reject",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  if (payslipOnly) {
    return (
      <AppLayout title="My Payslip">
        <div className="page-stack max-w-md">
          {payslipLoading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : myPayslip ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{myPayslip.fullName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  {myPayslip.jobTitle ?? "—"} · {myPayslip.teamName ?? "—"}
                </p>
                
                <div className="flex items-center gap-2 mt-1 mb-3">
                  <Badge variant="secondary" className="capitalize text-xs">
                    {myPayslip.salaryMode === "project_based" ? "Project-Based Pay" : "Monthly Salaried"}
                  </Badge>
                  <Badge variant="outline" className={cn(statusColor(myPayslip.payrollStatus))}>
                    {myPayslip.payrollStatus}
                  </Badge>
                </div>

                <div className="space-y-2 border-t border-border/60 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Base salary:</span>
                    <span>{formatCurrency(myPayslip.baseSalary)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Bonus:</span>
                    <span>{formatCurrency(myPayslip.bonus)}</span>
                  </div>
                  <div className="flex items-center justify-between text-base font-semibold border-t border-border/60 pt-2">
                    <span>Total pay:</span>
                    <span>{formatCurrency(myPayslip.totalPay)}</span>
                  </div>
                </div>

                {myPayslip.salaryMode === "project_based" && (
                  <div className="mt-4 pt-3 border-t border-border/60">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Project Payout Breakdown</p>
                    {myPayslip.projectBreakdown && myPayslip.projectBreakdown.length > 0 ? (
                      <div className="space-y-2 rounded-lg bg-muted/40 p-2.5">
                        {myPayslip.projectBreakdown.map((proj: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground font-medium">{proj.projectName || "Unnamed Project"}</span>
                            <span className="font-semibold text-foreground">{formatCurrency(proj.amount)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic bg-muted/40 rounded-lg p-2.5 text-center">No project allocations recorded for this month.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </AppLayout>
    );
  }

  const tabActions = (
    <>
      {activeTab === "salaries" && canPayroll && (
        <Button
          data-testid="btn-post-salary"
          className="hidden min-h-11 gap-2 sm:inline-flex"
          onClick={() => setSalaryOpen(true)}
        >
          <Plus size={16} /> Post Salary
        </Button>
      )}
      {activeTab === "expenses" && canWriteExpense && (
        <Button
          data-testid="btn-add-expense"
          className="hidden min-h-11 gap-2 sm:inline-flex"
          onClick={() => setExpenseOpen(true)}
        >
          <Plus size={16} /> Record Expense
        </Button>
      )}
      {activeTab === "payroll" && canPayroll && (
        <Button
          data-testid="btn-run-payroll"
          className="hidden min-h-11 gap-2 sm:inline-flex"
          onClick={() => setPayrollOpen(true)}
        >
          <Plus size={16} /> Run Payroll
        </Button>
      )}
    </>
  );

  const handleReviewProfile = (salary: SalaryRecord) => {
    setPreselectedUserId(salary.userId);
    setSalaryOpen(true);
  };

  const handleInspectProfile = (salary: SalaryRecord) => {
    toast({
      title: `Salary Breakdown: ${salary.fullName}`,
      description: `Base: ${formatCurrency(salary.baseSalary ?? 0)} | Bonus: ${formatCurrency(salary.bonus ?? 0)} | Total: ${formatCurrency(salary.totalPay ?? 0)} (${salary.payrollStatus})`,
    });
  };

  const handleReviewPosting = (posting: SalaryPostingRecord) => {
    toast({
      title: `Recent Posting: ${posting.fullName}`,
      description: `Allocated to: ${posting.projectName ?? "Monthly salary"} | Amount: ${formatCurrency(posting.totalPay)}`,
    });
  };

  const handleInspectPosting = (posting: SalaryPostingRecord) => {
    toast({
      title: `Posting Detail: ${posting.fullName}`,
      description: `Month: ${posting.month}/${posting.year} | Amount: ${formatCurrency(posting.totalPay)} (${posting.allocationType})`,
    });
  };

  return (
    <AppLayout title="Finance & Payroll">
      <StaggerList className="page-stack pb-24 sm:pb-8">
        {canSummary && <FinanceKpiGrid summary={summary} isLoading={summaryLoading} />}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="h-auto w-full justify-start overflow-x-auto p-1 sm:w-auto">
              {canSalaries && (
                <TabsTrigger value="salaries" className="min-h-11 shrink-0 px-4">
                  Salaries
                </TabsTrigger>
              )}
              {canExpenses && (
                <TabsTrigger value="expenses" className="min-h-11 shrink-0 px-4">
                  Expenses
                </TabsTrigger>
              )}
              {canPayroll && (
                <TabsTrigger value="payroll" className="min-h-11 shrink-0 px-4">
                  Payroll Runs
                </TabsTrigger>
              )}
            </TabsList>
            {tabActions}
          </div>

          {canSalaries && (
            <TabsContent value="salaries" className="mt-0">
              <FinanceSalariesTab
                salaries={salaries}
                postings={postings}
                isLoading={salariesLoading || postingsLoading}
                isError={salariesError}
                onRetry={() => {
                  void refetchSalaries();
                  void refetchPostings();
                }}
                onSwipeReviewProfile={handleReviewProfile}
                onSwipeInspectProfile={handleInspectProfile}
                onSwipeReviewPosting={handleReviewPosting}
                onSwipeInspectPosting={handleInspectPosting}
              />
            </TabsContent>
          )}

          {canExpenses && (
            <TabsContent value="expenses" className="mt-0">
              <FinanceExpensesTab
                expenses={expenses}
                isLoading={expensesLoading}
                isError={expensesError}
                onRetry={() => void refetchExpenses()}
                canApprove={canApproveExpense}
                onApprove={handleApproveExpense}
                onReject={handleRejectExpense}
              />
            </TabsContent>
          )}

          {canPayroll && (
            <TabsContent value="payroll" className="mt-0">
              <FinancePayrollTab
                payrollRuns={payrollRuns}
                isLoading={payrollLoading}
                isError={payrollError}
                onRetry={() => void refetchPayroll()}
              />
            </TabsContent>
          )}
        </Tabs>
      </StaggerList>

      {canPayroll && activeTab === "salaries" && (
        <Button
          data-testid="btn-post-salary-fab"
          size="lg"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50 h-14 w-14 rounded-full p-0 shadow-brand-md sm:hidden"
          onClick={() => setSalaryOpen(true)}
          aria-label="Post salary"
        >
          <Plus size={22} />
        </Button>
      )}
      {canWriteExpense && activeTab === "expenses" && (
        <Button
          data-testid="btn-add-expense-fab"
          size="lg"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50 h-14 w-14 rounded-full p-0 shadow-brand-md sm:hidden"
          onClick={() => setExpenseOpen(true)}
          aria-label="Record expense"
        >
          <Plus size={22} />
        </Button>
      )}
      {canPayroll && activeTab === "payroll" && (
        <Button
          data-testid="btn-run-payroll-fab"
          size="lg"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50 h-14 w-14 rounded-full p-0 shadow-brand-md sm:hidden"
          onClick={() => setPayrollOpen(true)}
          aria-label="Run payroll"
        >
          <Plus size={22} />
        </Button>
      )}

      {user && (
        <RecordExpenseSheet
          open={expenseOpen}
          onOpenChange={setExpenseOpen}
          defaultSubmitterId={user.id}
          showSubmitterPicker={showSubmitterPicker}
          saving={createExpense.isPending}
          onSubmit={onExpenseSubmit}
        />
      )}

      <PostSalarySheet
        open={salaryOpen}
        onOpenChange={(open) => {
          setSalaryOpen(open);
          if (!open) {
            setPreselectedUserId(undefined);
          }
        }}
        saving={createSalaryPosting.isPending}
        onSubmit={onSalarySubmit}
        defaultUserId={preselectedUserId}
      />

      <RunPayrollSheet
        open={payrollOpen}
        onOpenChange={setPayrollOpen}
        saving={createPayrollRun.isPending}
        onSubmit={onPayrollSubmit}
      />
    </AppLayout>
  );
}
