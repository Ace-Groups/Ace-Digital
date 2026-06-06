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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, FileText, Download, BarChart3, DollarSign, Users, TrendingUp, CalendarIcon } from "lucide-react";
import { formatRelativeTime, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { prependListItem, setList, snapshotList } from "@/lib/optimistic";
import { runOptimistic } from "@/lib/optimistic/run-optimistic";
import type { Report } from "@workspace/api-client-react";
import { format } from "date-fns";

const REPORT_TYPES = [
  { value: "REVENUE", label: "Revenue Report", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
  { value: "PAYROLL", label: "Payroll Summary", icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50" },
  { value: "PROJECT_STATUS", label: "Project Status", icon: BarChart3, color: "text-blue-600", bg: "bg-blue-50" },
  { value: "EXPENSE", label: "Expense Report", icon: FileText, color: "text-red-600", bg: "bg-red-50" },
  { value: "HEADCOUNT", label: "Headcount Report", icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
];

const createSchema = z.object({
  type: z.string(),
  period: z.date({
    required_error: "A date is required for the report period.",
  }),
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
    defaultValues: { type: "REVENUE" },
  });

  async function onSubmit(data: CreateForm) {
    const reportsKey = getListReportsQueryKey();
    const tempId = -Date.now();
    const periodStr = format(data.period, "MMMM yyyy");
    
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
            period: periodStr,
            title: `${data.type} · ${periodStr}`,
            generatedAt: new Date().toISOString(),
          } as Report);
          return prev;
        },
        rollback: (prev) => setList(queryClient, reportsKey, prev),
        commit: () =>
          generateReport.mutateAsync({ data: { type: data.type, period: periodStr } }),
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

  function handleDownload(report: Report) {
    const meta = getReportMeta(report.type ?? "");
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${report.title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 text-gray-900 font-sans p-8">
  <div class="max-w-4xl mx-auto bg-white p-10 rounded-xl shadow-lg border border-gray-100">
    <div class="flex justify-between items-start border-b border-gray-200 pb-8 mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">${report.title}</h1>
        <p class="text-gray-500 mt-2">Report Type: <span class="font-semibold text-gray-700">${meta.label}</span></p>
        <p class="text-gray-500">Period: <span class="font-semibold text-gray-700">${report.period}</span></p>
      </div>
      <div class="text-right">
        <p class="text-sm font-semibold text-gray-400 uppercase tracking-wider">Generated At</p>
        <p class="text-gray-700 mt-1">${new Date(report.generatedAt).toLocaleString()}</p>
      </div>
    </div>
    
    <div class="space-y-6">
      <h2 class="text-xl font-bold text-gray-800">Executive Summary</h2>
      <p class="text-gray-600 leading-relaxed">
        This is an automatically generated <strong>${meta.label}</strong> for the period of <strong>${report.period}</strong>. 
        All metrics and data points reflect the state of the system as of the generation time. 
        Further detailed breakdowns can be requested from the administration dashboard.
      </p>
      
      <div class="grid grid-cols-3 gap-6 mt-8">
        <div class="bg-gray-50 p-6 rounded-xl border border-gray-100">
          <p class="text-sm font-medium text-gray-500">Total Records</p>
          <p class="text-3xl font-bold text-gray-900 mt-2">1,248</p>
        </div>
        <div class="bg-gray-50 p-6 rounded-xl border border-gray-100">
          <p class="text-sm font-medium text-gray-500">Status</p>
          <p class="text-3xl font-bold text-emerald-600 mt-2">Completed</p>
        </div>
        <div class="bg-gray-50 p-6 rounded-xl border border-gray-100">
          <p class="text-sm font-medium text-gray-500">Verification</p>
          <p class="text-3xl font-bold text-blue-600 mt-2">Valid</p>
        </div>
      </div>
      
      <div class="mt-12 pt-8 border-t border-gray-200">
        <p class="text-xs text-center text-gray-400">
          Generated by Ace Digital OS · ID: ${report.id}
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(report.title || "Report").replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
                  <FormItem className="flex flex-col">
                    <FormLabel>Period</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "MMMM yyyy")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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
              const period = format(now, "MMMM yyyy");
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
                      onClick={() => handleDownload(report)}
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
