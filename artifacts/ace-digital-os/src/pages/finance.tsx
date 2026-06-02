import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useGetFinanceSummary,
  useGetMyPayslip,
  useListSalaries,
  useListExpenses,
  useListPayrollRuns,
  useCreatePayrollRun,
  useCreateExpense,
  useListTeams,
  usePatchExpenseStatus,
  getListPayrollRunsQueryKey,
  getGetMyPayslipQueryKey,
  getGetFinanceSummaryQueryKey,
  getListSalariesQueryKey,
  getListExpensesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp, TrendingDown, DollarSign, Wallet, Users, FileText, Plus,
} from "lucide-react";
import { formatCurrency, statusColor, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";


export default function FinancePage() {
  const { can } = usePermissions();
  const payslipOnly = can("finance:salaries_self") && !can("finance:summary");
  const { data: myPayslip, isLoading: payslipLoading } = useGetMyPayslip({
    query: { enabled: payslipOnly, queryKey: getGetMyPayslipQueryKey() },
  });
  const { data: summary, isLoading: summaryLoading } = useGetFinanceSummary({
    query: { enabled: !payslipOnly, queryKey: getGetFinanceSummaryQueryKey() },
  });
  const { data: salaries } = useListSalaries({
    query: { enabled: !payslipOnly, queryKey: getListSalariesQueryKey() },
  });
  const { data: expenses } = useListExpenses({
    query: { enabled: !payslipOnly, queryKey: getListExpensesQueryKey() },
  });
  const { data: payrollRuns } = useListPayrollRuns({
    query: { enabled: !payslipOnly, queryKey: getListPayrollRunsQueryKey() },
  });
  const createPayrollRun = useCreatePayrollRun();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const { data: teams } = useListTeams();
  const createExpense = useCreateExpense();

  const expenseSchema = z.object({
    description: z.string().min(1, "Description is required"),
    amount: z.string().min(1, "Amount is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Amount must be a positive number",
    }),
    teamId: z.string().optional(),
  });
  type ExpenseFormValues = z.infer<typeof expenseSchema>;

  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      amount: "",
      teamId: "",
    },
  });

  async function onExpenseSubmit(data: ExpenseFormValues) {
    try {
      await createExpense.mutateAsync({
        data: {
          description: data.description,
          amount: Number(data.amount),
          teamId: data.teamId ? Number(data.teamId) : undefined,
        },
      });
      queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetFinanceSummaryQueryKey() });
      toast({ title: "Expense recorded successfully!" });
      setExpenseDialogOpen(false);
      expenseForm.reset();
    } catch (error) {
      toast({
        title: "Failed to record expense",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  const patchExpenseStatus = usePatchExpenseStatus();

  async function handleApproveExpense(id: number) {
    try {
      await patchExpenseStatus.mutateAsync({ id, data: { status: "APPROVED" } });
      queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetFinanceSummaryQueryKey() });
      toast({ title: "Expense approved!" });
    } catch (error) {
      toast({
        title: "Failed to approve expense",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  async function handleRejectExpense(id: number) {
    try {
      await patchExpenseStatus.mutateAsync({ id, data: { status: "REJECTED" } });
      queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetFinanceSummaryQueryKey() });
      toast({ title: "Expense rejected!", variant: "destructive" });
    } catch (error) {
      toast({
        title: "Failed to reject expense",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  if (payslipOnly) {
    return (
      <AppLayout title="My Payslip">
        {payslipLoading ? (
          <Skeleton className="h-48 w-full max-w-md" />
        ) : myPayslip ? (
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-lg">{myPayslip.fullName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                {myPayslip.jobTitle ?? "—"} · {myPayslip.teamName ?? "—"}
              </p>
              <p>Base salary: {formatCurrency(myPayslip.baseSalary)}</p>
              <p>Bonus: {formatCurrency(myPayslip.bonus)}</p>
              <p className="text-base font-semibold pt-2">
                Total: {formatCurrency(myPayslip.totalPay)}
              </p>
              <Badge variant="outline" className={cn("mt-2", statusColor(myPayslip.payrollStatus))}>
                {myPayslip.payrollStatus}
              </Badge>
            </CardContent>
          </Card>
        ) : null}
      </AppLayout>
    );
  }

  async function handleRunPayroll() {
    const now = new Date();
    await createPayrollRun.mutateAsync({
      data: { month: now.getMonth() + 1, year: now.getFullYear() },
    });
    queryClient.invalidateQueries({ queryKey: getListPayrollRunsQueryKey() });
    toast({ title: "Payroll run created!" });
  }

  const kpis = [
    {
      label: "Total Revenue",
      value: formatCurrency(summary?.totalRevenue ?? 0),
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Total Expenses",
      value: formatCurrency(summary?.totalExpenses ?? 0),
      icon: TrendingDown,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Net Profit",
      value: formatCurrency(summary?.netProfit ?? 0),
      icon: DollarSign,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Monthly Payroll",
      value: formatCurrency(summary?.totalPayroll ?? 0),
      icon: Users,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <AppLayout title="Finance & Payroll">
      <div className="page-stack">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} data-testid={`finance-stat-${label.toLowerCase().replace(/ /g, "-")}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    {summaryLoading ? (
                      <Skeleton className="h-7 w-28 mt-1" />
                    ) : (
                      <p className="text-xl font-bold text-foreground mt-1">{value}</p>
                    )}
                  </div>
                  <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon size={18} className={color} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="salaries">
          <TabsList>
            <TabsTrigger value="salaries">Salaries</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="payroll">Payroll Runs</TabsTrigger>
          </TabsList>

          {/* Salaries tab */}
          <TabsContent value="salaries">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Team</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Job Title</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Base Salary</th>
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
                          <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(s.bonus ?? 0)}</td>
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
          </TabsContent>

          {/* Expenses tab */}
          <TabsContent value="expenses">
            <div className="flex justify-end mb-3">
              <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="btn-add-expense" className="gap-2">
                    <Plus size={16} /> Record Expense
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Record Expense</DialogTitle>
                    <DialogDescription>
                      Submit a new business expense. It will be recorded as PENDING.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...expenseForm}>
                    <form onSubmit={expenseForm.handleSubmit(onExpenseSubmit)} className="space-y-4">
                      <FormField
                        control={expenseForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input data-testid="input-expense-desc" placeholder="e.g. AWS Hosting Bill" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={expenseForm.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount (₹)</FormLabel>
                            <FormControl>
                              <Input data-testid="input-expense-amount" type="number" step="0.01" placeholder="e.g. 45000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={expenseForm.control}
                        name="teamId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Team</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select team" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {teams?.map((t) => (
                                  <SelectItem key={t.id} value={String(t.id)}>
                                    {t.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        data-testid="btn-submit-expense"
                        type="submit"
                        className="w-full"
                        disabled={createExpense.isPending}
                      >
                        Record Expense
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
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
                        {can("finance:expenses_approve") && (
                          <th className="text-center px-4 py-3 font-medium text-muted-foreground">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {expenses?.map((e) => (
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
                          {can("finance:expenses_approve") && (
                            <td className="px-4 py-3 text-center">
                              {e.status === "PENDING" ? (
                                <div className="flex justify-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                                    onClick={() => handleApproveExpense(e.id)}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                    onClick={() => handleRejectExpense(e.id)}
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
          </TabsContent>

          {/* Payroll runs tab */}
          <TabsContent value="payroll">
            <div className="flex justify-end mb-3">
              <Button
                data-testid="btn-run-payroll"
                onClick={handleRunPayroll}
                disabled={createPayrollRun.isPending}
                className="gap-2"
              >
                <Plus size={16} /> Run Payroll
              </Button>
            </div>
            <Card>
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
                      {payrollRuns?.map((r) => (
                        <tr key={r.id} data-testid={`payroll-row-${r.id}`} className="hover:bg-muted/40">
                          <td className="px-4 py-3 font-medium">
                            {new Date(r.year, r.month - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">{formatCurrency(r.totalAmount ?? 0)}</td>
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
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
