import { AppLayout } from "@/components/layout/AppLayout";
import {
  useGetFinanceSummary,
  useGetMyPayslip,
  useListSalaries,
  useListExpenses,
  useListPayrollRuns,
  useCreatePayrollRun,
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
                      <tr className="border-b bg-gray-50/50">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Team</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Job Title</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Base Salary</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Bonus</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                        <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {salaries?.map((s) => (
                        <tr key={s.userId} data-testid={`salary-row-${s.userId}`} className="hover:bg-gray-50/50">
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
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50/50">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Team</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Submitted By</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                        <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {expenses?.map((e) => (
                        <tr key={e.id} data-testid={`expense-row-${e.id}`} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-medium">{e.description}</td>
                          <td className="px-4 py-3 text-muted-foreground">{e.teamName ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{e.submitterName ?? "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatCurrency(e.amount ?? 0)}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline" className={cn("text-xs", statusColor(e.status ?? ""))}>
                              {e.status}
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
                      <tr className="border-b bg-gray-50/50">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total Amount</th>
                        <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {payrollRuns?.map((r) => (
                        <tr key={r.id} data-testid={`payroll-row-${r.id}`} className="hover:bg-gray-50/50">
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
