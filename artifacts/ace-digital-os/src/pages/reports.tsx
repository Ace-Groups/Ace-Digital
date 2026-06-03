import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useListReports, useGenerateReport, getListReportsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, FileText, Download, BarChart3, DollarSign, Users, TrendingUp } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { prependListItem, setList, snapshotList } from "@/lib/optimistic";
import { runOptimistic } from "@/lib/optimistic/run-optimistic";
import type { Report } from "@workspace/api-client-react";

const REPORT_TYPES = [
  { value: "REVENUE", label: "Revenue Report", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
  { value: "PAYROLL", label: "Payroll Summary", icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50" },
  { value: "PROJECT_STATUS", label: "Project Status", icon: BarChart3, color: "text-blue-600", bg: "bg-blue-50" },
  { value: "EXPENSE", label: "Expense Report", icon: FileText, color: "text-red-600", bg: "bg-red-50" },
  { value: "HEADCOUNT", label: "Headcount Report", icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
];

const createSchema = z.object({
  type: z.string(),
  period: z.string().min(1, "Period required"),
});
type CreateForm = z.infer<typeof createSchema>;

export default function ReportsPage() {
  const { data: reports, isLoading } = useListReports();
  const generateReport = useGenerateReport();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { type: "REVENUE", period: "" },
  });

  async function onSubmit(data: CreateForm) {
    const reportsKey = getListReportsQueryKey();
    const tempId = -Date.now();
    setOpen(false);
    form.reset();
    toast({ title: "Generating report…" });
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<Report>(queryClient, reportsKey);
          prependListItem(queryClient, reportsKey, {
            id: tempId,
            type: data.type,
            period: data.period,
            title: `${data.type} · ${data.period}`,
            generatedAt: new Date().toISOString(),
          } as Report);
          return prev;
        },
        rollback: (prev) => setList(queryClient, reportsKey, prev),
        commit: () =>
          generateReport.mutateAsync({ data: { type: data.type, period: data.period } }),
        reconcile: () => {
          void queryClient.invalidateQueries({ queryKey: reportsKey });
        },
      });
      toast({ title: "Report generated!" });
    } catch {
      toast({ title: "Could not generate report", variant: "destructive" });
    }
  }

  function getReportMeta(type: string) {
    return REPORT_TYPES.find((r) => r.value === type) ?? REPORT_TYPES[0];
  }

  return (
    <AppLayout title="Reports">
      <div className="page-stack">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{reports?.length ?? 0} reports generated</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="btn-generate-report" className="gap-2">
              <Plus size={16} /> Generate Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Generate Report</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mobile-form space-y-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {REPORT_TYPES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="period" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period</FormLabel>
                    <FormControl>
                      <Input data-testid="input-report-period" placeholder="e.g. June 2026, Q2 2026" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button data-testid="btn-submit-report" type="submit" className="w-full" disabled={generateReport.isPending}>
                  Generate
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick actions */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {REPORT_TYPES.map(({ value, label, icon: Icon, color, bg }) => (
          <button
            key={value}
            data-testid={`quick-report-${value.toLowerCase()}`}
            onClick={() => {
              const now = new Date();
              const period = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
              toast({ title: `Generating ${label}…` });
              void generateReport
                .mutateAsync({ data: { type: value, period } })
                .then(() => {
                  void queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
                  toast({ title: `${label} generated for ${period}` });
                })
                .catch(() => {
                  toast({ title: "Could not generate report", variant: "destructive" });
                });
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:shadow-brand-md transition-all group"
          >
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
              <Icon size={18} className={color} />
            </div>
            <span className="text-xs font-medium text-foreground text-center leading-tight">{label}</span>
          </button>
        ))}
      </div>

      {/* Report history */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : reports?.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No reports generated yet</div>
          ) : (
            <div className="divide-y divide-border">
              {reports?.map((report) => {
                const meta = getReportMeta(report.type ?? "");
                const Icon = meta.icon;
                return (
                  <div key={report.id} data-testid={`report-row-${report.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className={`w-9 h-9 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                      <Icon size={16} className={meta.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{report.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Period: {report.period} · Generated {formatRelativeTime(report.generatedAt)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {report.type?.replace("_", " ")}
                    </Badge>
                    <button
                      data-testid={`btn-download-report-${report.id}`}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Download"
                    >
                      <Download size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </AppLayout>
  );
}
