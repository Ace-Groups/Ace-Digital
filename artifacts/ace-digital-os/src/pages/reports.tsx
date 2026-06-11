import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { CanvasPanel, PageCanvasShell } from "@/components/canvas";
import {
  useListReports,
  useGenerateReport,
  useListProjects,
  useListTasks,
  useListEmployees,
  useListClients,
  useListSalaryPostings,
  getListReportsQueryKey,
  useAiReportNarrative,
} from "@workspace/api-client-react";
import type {
  Report,
  Project,
  Task,
  Employee,
  Client,
  SalaryPostingRecord,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  FileText,
  Download,
  BarChart3,
  DollarSign,
  Users,
  TrendingUp,
  CalendarIcon,
  Loader2,
  Sparkles,
} from "lucide-react";
import { formatRelativeTime, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { prependListItem, setList, snapshotList } from "@/lib/optimistic";
import { runOptimistic } from "@/lib/optimistic/run-optimistic";
import { format } from "date-fns";

/* ────────────────────────────────────────────────────────────────────────────
   Report type metadata
   ──────────────────────────────────────────────────────────────────────────── */

const REPORT_TYPES = [
  {
    value: "REVENUE",
    label: "Revenue Report",
    icon: TrendingUp,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    value: "PAYROLL",
    label: "Payroll Summary",
    icon: DollarSign,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    value: "PROJECT_STATUS",
    label: "Project Status",
    icon: BarChart3,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    value: "EXPENSE",
    label: "Expense Report",
    icon: FileText,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  {
    value: "HEADCOUNT",
    label: "Headcount Report",
    icon: Users,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
];

function getReportMeta(type: string) {
  return REPORT_TYPES.find((r) => r.value === type) ?? REPORT_TYPES[0];
}

/* ────────────────────────────────────────────────────────────────────────────
   HTML Template Builders — one per report type, using real data
   ──────────────────────────────────────────────────────────────────────────── */

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function wrapTemplate(title: string, period: string, type: string, body: string): string {
  const meta = getReportMeta(type);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #f8f9fa; color: #1a1a2e; padding: 40px 20px; }
    .page { max-width: 900px; margin: 0 auto; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); overflow: hidden; }
    .header { background: linear-gradient(135deg, #0f0c29, #302b63, #24243e); color: #fff; padding: 40px 48px; }
    .header h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
    .header .sub { display: flex; gap: 24px; margin-top: 12px; font-size: 14px; opacity: 0.8; }
    .header .sub span { display: flex; align-items: center; gap: 6px; }
    .body { padding: 40px 48px; }
    .section { margin-bottom: 36px; }
    .section-title { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6c63ff; margin-bottom: 16px; border-bottom: 2px solid #6c63ff22; padding-bottom: 8px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .kpi { background: #f8f9fa; border-radius: 12px; padding: 20px; border: 1px solid #e9ecef; }
    .kpi .label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #6c757d; }
    .kpi .value { font-size: 28px; font-weight: 700; margin-top: 6px; color: #1a1a2e; }
    .kpi .value.green { color: #059669; }
    .kpi .value.blue { color: #2563eb; }
    .kpi .value.amber { color: #d97706; }
    .kpi .value.red { color: #dc2626; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead th { background: #f8f9fa; padding: 12px 16px; text-align: left; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6; white-space: nowrap; }
    tbody td { padding: 11px 16px; border-bottom: 1px solid #f1f3f5; }
    tbody tr:hover { background: #f8f9fa; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-gray { background: #f3f4f6; color: #374151; }
    .footer { padding: 24px 48px; border-top: 1px solid #e9ecef; text-align: center; font-size: 12px; color: #adb5bd; }
    .progress-bar { width: 100%; height: 6px; background: #e9ecef; border-radius: 3px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 3px; background: #6c63ff; }
    @media print { body { padding: 0; background: #fff; } .page { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h1>${escHtml(title)}</h1>
      <div class="sub">
        <span>📊 ${escHtml(meta.label)}</span>
        <span>📅 ${escHtml(period)}</span>
        <span>🕐 Generated: ${new Date().toLocaleString()}</span>
      </div>
    </div>
    <div class="body">${body}</div>
    <div class="footer">
      Generated by <strong>Ace Digital OS</strong> · © ${new Date().getFullYear()} Ace Digital · mybexo.com
    </div>
  </div>
</body>
</html>`;
}

function statusBadge(status: string): string {
  const s = status.toLowerCase();
  let cls = "badge-gray";
  if (s.includes("active") || s.includes("complet") || s.includes("paid")) cls = "badge-green";
  else if (s.includes("progress") || s.includes("review")) cls = "badge-blue";
  else if (s.includes("pend") || s.includes("hold") || s.includes("draft")) cls = "badge-amber";
  else if (s.includes("cancel") || s.includes("overdue") || s.includes("block")) cls = "badge-red";
  return `<span class="badge ${cls}">${escHtml(status)}</span>`;
}

/* ── Revenue Report ── */
function buildRevenueReport(
  report: Report,
  clients: Client[],
  projects: Project[]
): string {
  const activeClients = clients.filter((c) => c.status === "active");
  const totalRevenue = activeClients.reduce(
    (sum, c) => sum + (c.contractValue ?? 0),
    0
  );
  const avgDealSize =
    activeClients.length > 0
      ? Math.round(totalRevenue / activeClients.length)
      : 0;
  const totalBudget = projects.reduce((s, p) => s + (p.budget ?? 0), 0);

  const body = `
    <div class="kpi-grid">
      <div class="kpi"><div class="label">Total Revenue</div><div class="value green">${fmtCurrency(totalRevenue)}</div></div>
      <div class="kpi"><div class="label">Active Clients</div><div class="value blue">${activeClients.length}</div></div>
      <div class="kpi"><div class="label">Avg Deal Size</div><div class="value">${fmtCurrency(avgDealSize)}</div></div>
      <div class="kpi"><div class="label">Project Budget Total</div><div class="value amber">${fmtCurrency(totalBudget)}</div></div>
    </div>

    <div class="section">
      <div class="section-title">Client Revenue Breakdown</div>
      <table>
        <thead><tr><th>Company</th><th>Contact</th><th>Contract Value</th><th>Status</th></tr></thead>
        <tbody>
          ${activeClients
            .sort((a, b) => (b.contractValue ?? 0) - (a.contractValue ?? 0))
            .map(
              (c) => `<tr>
              <td><strong>${escHtml(c.companyName)}</strong></td>
              <td>${escHtml(c.contactName)}</td>
              <td>${fmtCurrency(c.contractValue ?? 0)}</td>
              <td>${statusBadge(c.status)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Revenue by Project</div>
      <table>
        <thead><tr><th>Project</th><th>Team</th><th>Budget</th><th>Progress</th><th>Status</th></tr></thead>
        <tbody>
          ${projects
            .filter((p) => (p.budget ?? 0) > 0)
            .sort((a, b) => (b.budget ?? 0) - (a.budget ?? 0))
            .map(
              (p) => `<tr>
              <td><strong>${escHtml(p.name)}</strong></td>
              <td>${escHtml(p.teamName ?? "—")}</td>
              <td>${fmtCurrency(p.budget ?? 0)}</td>
              <td><div class="progress-bar"><div class="progress-fill" style="width:${p.progress}%"></div></div> ${p.progress}%</td>
              <td>${statusBadge(p.status)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
  return wrapTemplate(report.title, report.period, report.type, body);
}

/* ── Payroll Report ── */
function buildPayrollReport(
  report: Report,
  employees: Employee[],
  salaryPostings: SalaryPostingRecord[]
): string {
  const activeEmployees = employees.filter((e) => e.status !== "inactive");
  const totalBaseSalary = activeEmployees.reduce(
    (s, e) => s + (e.baseSalary ?? 0),
    0
  );
  const totalBonus = activeEmployees.reduce((s, e) => s + (e.bonus ?? 0), 0);
  const totalPayroll = totalBaseSalary + totalBonus;

  const body = `
    <div class="kpi-grid">
      <div class="kpi"><div class="label">Total Payroll</div><div class="value green">${fmtCurrency(totalPayroll)}</div></div>
      <div class="kpi"><div class="label">Base Salary Total</div><div class="value blue">${fmtCurrency(totalBaseSalary)}</div></div>
      <div class="kpi"><div class="label">Bonus Total</div><div class="value amber">${fmtCurrency(totalBonus)}</div></div>
      <div class="kpi"><div class="label">Active Employees</div><div class="value">${activeEmployees.length}</div></div>
    </div>

    <div class="section">
      <div class="section-title">Employee Payroll Details</div>
      <table>
        <thead><tr><th>#</th><th>Employee</th><th>Team</th><th>Base Salary</th><th>Bonus</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
          ${activeEmployees
            .sort((a, b) => ((b.baseSalary ?? 0) + (b.bonus ?? 0)) - ((a.baseSalary ?? 0) + (a.bonus ?? 0)))
            .map(
              (e, i) => `<tr>
              <td>${i + 1}</td>
              <td><strong>${escHtml(e.fullName)}</strong><br><span style="font-size:11px;color:#6c757d">${escHtml(e.jobTitle ?? e.role)}</span></td>
              <td>${escHtml(e.teamName ?? "—")}</td>
              <td>${fmtCurrency(e.baseSalary ?? 0)}</td>
              <td>${fmtCurrency(e.bonus ?? 0)}</td>
              <td><strong>${fmtCurrency((e.baseSalary ?? 0) + (e.bonus ?? 0))}</strong></td>
              <td>${statusBadge(e.payrollStatus ?? e.status ?? "active")}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>

    ${salaryPostings.length > 0 ? `
    <div class="section">
      <div class="section-title">Recent Salary Postings</div>
      <table>
        <thead><tr><th>Employee</th><th>Project</th><th>Amount</th><th>Date</th></tr></thead>
        <tbody>
          ${salaryPostings
            .slice(0, 20)
            .map(
              (sp) => `<tr>
              <td>${escHtml(sp.fullName ?? "—")}</td>
              <td>${escHtml(sp.projectName ?? "—")}</td>
              <td>${fmtCurrency(sp.totalPay ?? 0)}</td>
              <td>${sp.createdAt ? new Date(sp.createdAt).toLocaleDateString() : "—"}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>` : ""}`;
  return wrapTemplate(report.title, report.period, report.type, body);
}

/* ── Project Status Report ── */
function buildProjectStatusReport(
  report: Report,
  projects: Project[],
  tasks: Task[]
): string {
  const active = projects.filter((p) => p.status !== "completed" && p.status !== "cancelled");
  const completed = projects.filter((p) => p.status === "completed");
  const avgProgress =
    projects.length > 0
      ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
      : 0;
  const overdue = projects.filter(
    (p) => p.deadline && new Date(p.deadline) < new Date() && p.status !== "completed"
  );

  const body = `
    <div class="kpi-grid">
      <div class="kpi"><div class="label">Total Projects</div><div class="value blue">${projects.length}</div></div>
      <div class="kpi"><div class="label">Active</div><div class="value green">${active.length}</div></div>
      <div class="kpi"><div class="label">Completed</div><div class="value">${completed.length}</div></div>
      <div class="kpi"><div class="label">Overdue</div><div class="value red">${overdue.length}</div></div>
      <div class="kpi"><div class="label">Avg Progress</div><div class="value">${avgProgress}%</div></div>
    </div>

    <div class="section">
      <div class="section-title">All Projects</div>
      <table>
        <thead><tr><th>Project</th><th>Team</th><th>Client</th><th>Priority</th><th>Progress</th><th>Deadline</th><th>Status</th></tr></thead>
        <tbody>
          ${projects
            .sort((a, b) => b.progress - a.progress)
            .map(
              (p) => `<tr>
              <td><strong>${escHtml(p.name)}</strong></td>
              <td>${escHtml(p.teamName ?? "—")}</td>
              <td>${escHtml(p.clientName ?? "—")}</td>
              <td>${statusBadge(p.priority)}</td>
              <td><div class="progress-bar"><div class="progress-fill" style="width:${p.progress}%"></div></div> ${p.progress}%</td>
              <td>${p.deadline ? new Date(p.deadline).toLocaleDateString() : "—"}</td>
              <td>${statusBadge(p.status)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Task Summary</div>
      <div class="kpi-grid">
        <div class="kpi"><div class="label">Total Tasks</div><div class="value">${tasks.length}</div></div>
        <div class="kpi"><div class="label">Completed</div><div class="value green">${tasks.filter((t) => t.status === "done").length}</div></div>
        <div class="kpi"><div class="label">In Progress</div><div class="value blue">${tasks.filter((t) => t.status === "in_progress").length}</div></div>
        <div class="kpi"><div class="label">To Do</div><div class="value amber">${tasks.filter((t) => t.status === "todo").length}</div></div>
      </div>
    </div>`;
  return wrapTemplate(report.title, report.period, report.type, body);
}

/* ── Expense Report ── */
function buildExpenseReport(
  report: Report,
  projects: Project[],
  salaryPostings: SalaryPostingRecord[]
): string {
  const totalBudget = projects.reduce((s, p) => s + (p.budget ?? 0), 0);
  const totalSalaryExpense = salaryPostings.reduce(
    (s, sp) => s + (sp.totalPay ?? 0),
    0
  );

  const body = `
    <div class="kpi-grid">
      <div class="kpi"><div class="label">Project Budgets</div><div class="value blue">${fmtCurrency(totalBudget)}</div></div>
      <div class="kpi"><div class="label">Salary Expenses</div><div class="value amber">${fmtCurrency(totalSalaryExpense)}</div></div>
      <div class="kpi"><div class="label">Total Expenses</div><div class="value red">${fmtCurrency(totalBudget + totalSalaryExpense)}</div></div>
      <div class="kpi"><div class="label">Projects Count</div><div class="value">${projects.length}</div></div>
    </div>

    <div class="section">
      <div class="section-title">Project Budget Allocation</div>
      <table>
        <thead><tr><th>Project</th><th>Team</th><th>Budget</th><th>Progress</th><th>Status</th></tr></thead>
        <tbody>
          ${projects
            .filter((p) => (p.budget ?? 0) > 0)
            .sort((a, b) => (b.budget ?? 0) - (a.budget ?? 0))
            .map(
              (p) => `<tr>
              <td><strong>${escHtml(p.name)}</strong></td>
              <td>${escHtml(p.teamName ?? "—")}</td>
              <td>${fmtCurrency(p.budget ?? 0)}</td>
              <td><div class="progress-bar"><div class="progress-fill" style="width:${p.progress}%"></div></div> ${p.progress}%</td>
              <td>${statusBadge(p.status)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>

    ${salaryPostings.length > 0 ? `
    <div class="section">
      <div class="section-title">Salary Expense Breakdown</div>
      <table>
        <thead><tr><th>Employee</th><th>Project</th><th>Base</th><th>Bonus</th><th>Total</th></tr></thead>
        <tbody>
          ${salaryPostings
            .slice(0, 30)
            .map(
              (sp) => `<tr>
              <td>${escHtml(sp.fullName ?? "—")}</td>
              <td>${escHtml(sp.projectName ?? "—")}</td>
              <td>${fmtCurrency(sp.baseSalary ?? 0)}</td>
              <td>${fmtCurrency(sp.bonus ?? 0)}</td>
              <td><strong>${fmtCurrency(sp.totalPay ?? 0)}</strong></td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>` : ""}`;
  return wrapTemplate(report.title, report.period, report.type, body);
}

/* ── Headcount Report ── */
function buildHeadcountReport(
  report: Report,
  employees: Employee[]
): string {
  const active = employees.filter((e) => e.status !== "inactive");
  const inactive = employees.filter((e) => e.status === "inactive");

  // Group by team
  const teamMap = new Map<string, Employee[]>();
  for (const e of active) {
    const team = e.teamName ?? "Unassigned";
    if (!teamMap.has(team)) teamMap.set(team, []);
    teamMap.get(team)!.push(e);
  }

  // Group by role
  const roleMap = new Map<string, number>();
  for (const e of active) {
    const role = e.jobTitle ?? e.role ?? "Unknown";
    roleMap.set(role, (roleMap.get(role) ?? 0) + 1);
  }

  const body = `
    <div class="kpi-grid">
      <div class="kpi"><div class="label">Total Employees</div><div class="value blue">${employees.length}</div></div>
      <div class="kpi"><div class="label">Active</div><div class="value green">${active.length}</div></div>
      <div class="kpi"><div class="label">Inactive</div><div class="value red">${inactive.length}</div></div>
      <div class="kpi"><div class="label">Teams</div><div class="value">${teamMap.size}</div></div>
    </div>

    <div class="section">
      <div class="section-title">Team Distribution</div>
      <table>
        <thead><tr><th>Team</th><th>Members</th><th>% of Total</th></tr></thead>
        <tbody>
          ${Array.from(teamMap.entries())
            .sort((a, b) => b[1].length - a[1].length)
            .map(
              ([team, members]) => `<tr>
              <td><strong>${escHtml(team)}</strong></td>
              <td>${members.length}</td>
              <td>${active.length > 0 ? Math.round((members.length / active.length) * 100) : 0}%</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Role Distribution</div>
      <table>
        <thead><tr><th>Role / Job Title</th><th>Count</th></tr></thead>
        <tbody>
          ${Array.from(roleMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(
              ([role, count]) => `<tr>
              <td>${escHtml(role)}</td>
              <td>${count}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Full Employee Roster</div>
      <table>
        <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Team</th><th>Job Title</th><th>Status</th></tr></thead>
        <tbody>
          ${employees
            .sort((a, b) => a.fullName.localeCompare(b.fullName))
            .map(
              (e, i) => `<tr>
              <td>${i + 1}</td>
              <td><strong>${escHtml(e.fullName)}</strong></td>
              <td>${escHtml(e.email)}</td>
              <td>${escHtml(e.teamName ?? "—")}</td>
              <td>${escHtml(e.jobTitle ?? e.role)}</td>
              <td>${statusBadge(e.status ?? "active")}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
  return wrapTemplate(report.title, report.period, report.type, body);
}

/* ────────────────────────────────────────────────────────────────────────────
   Form schema
   ──────────────────────────────────────────────────────────────────────────── */

const createSchema = z.object({
  type: z.string(),
  period: z.date({
    required_error: "A date is required for the report period.",
  }),
});
type CreateForm = z.infer<typeof createSchema>;

/* ────────────────────────────────────────────────────────────────────────────
   Page Component
   ──────────────────────────────────────────────────────────────────────────── */

export default function ReportsPage() {
  const { data: reports, isLoading } = useListReports();
  const { data: projects } = useListProjects();
  const { data: tasks } = useListTasks();
  const { data: employees } = useListEmployees();
  const { data: clients } = useListClients();
  const { data: salaryPostings } = useListSalaryPostings();
  const generateReport = useGenerateReport();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [aiSummaryOpen, setAiSummaryOpen] = useState(false);
  const [aiSummaryText, setAiSummaryText] = useState("");
  const [aiSummaryTitle, setAiSummaryTitle] = useState("");

  const aiNarrative = useAiReportNarrative({
    mutation: {
      onSuccess: (data) => {
        setAiSummaryText(data.narrative);
        setAiSummaryOpen(true);
      },
      onError: () => {
        toast({ title: "AI summary failed", variant: "destructive" });
      },
    },
  });

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
          generateReport.mutateAsync({
            data: { type: data.type, period: periodStr },
          }),
        reconcile: () => {
          void queryClient.invalidateQueries({ queryKey: reportsKey });
        },
      });
      toast({ title: "Report generated!" });
    } catch {
      toast({ title: "Could not generate report", variant: "destructive" });
    }
  }

  /* ── Download handler — builds real HTML template per type ── */
  function handleDownload(report: Report) {
    setDownloading(report.id);

    let html: string;
    try {
      switch (report.type) {
        case "REVENUE":
          html = buildRevenueReport(report, clients ?? [], projects ?? []);
          break;
        case "PAYROLL":
          html = buildPayrollReport(
            report,
            employees ?? [],
            salaryPostings ?? []
          );
          break;
        case "PROJECT_STATUS":
          html = buildProjectStatusReport(report, projects ?? [], tasks ?? []);
          break;
        case "EXPENSE":
          html = buildExpenseReport(
            report,
            projects ?? [],
            salaryPostings ?? []
          );
          break;
        case "HEADCOUNT":
          html = buildHeadcountReport(report, employees ?? []);
          break;
        default:
          html = buildProjectStatusReport(report, projects ?? [], tasks ?? []);
      }

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(report.title || "Report").replace(/[^a-z0-9]+/gi, "_").toLowerCase()}.html`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();

      // Clean up after a tick
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      toast({ title: "Report downloaded!" });
    } catch (err) {
      console.error("Download failed:", err);
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  }

  function handleAiSummary(report: Report) {
    setAiSummaryTitle(report.title ?? "Report");
    toast({ title: "Generating AI summary…" });
    aiNarrative.mutate({
      data: {
        type: report.type ?? "PROJECT_STATUS",
        period: report.period ?? "",
      },
    });
  }

  /* ── Quick generate (for the type cards) ── */
  function handleQuickGenerate(type: string, label: string) {
    const now = new Date();
    const period = format(now, "MMMM yyyy");
    toast({ title: `Generating ${label}…` });
    void generateReport
      .mutateAsync({ data: { type, period } })
      .then(() => {
        void queryClient.invalidateQueries({
          queryKey: getListReportsQueryKey(),
        });
        toast({ title: `${label} generated for ${period}` });
      })
      .catch(() => {
        toast({ title: "Could not generate report", variant: "destructive" });
      });
  }

  const totalReports = reports?.length ?? 0;
  const reportTypeCount = useMemo(
    () => new Set(reports?.map((r) => r.type).filter(Boolean)).size,
    [reports],
  );
  const recentReports = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return (
      reports?.filter((r) => r.generatedAt && new Date(r.generatedAt).getTime() >= cutoff).length ??
      0
    );
  }, [reports]);

  const reportMetrics = useMemo(
    () => [
      {
        key: "total",
        label: "Total reports",
        value: totalReports,
        icon: FileText,
        iconBg: "bg-primary/10",
        iconColor: "text-primary",
      },
      {
        key: "types",
        label: "Report types",
        value: reportTypeCount,
        icon: BarChart3,
        iconBg: "bg-sky-500/10",
        iconColor: "text-sky-600 dark:text-sky-400",
      },
      {
        key: "recent",
        label: "Last 30 days",
        value: recentReports,
        icon: TrendingUp,
        iconBg: "bg-emerald-500/10",
        iconColor: "text-emerald-600 dark:text-emerald-400",
      },
    ],
    [totalReports, reportTypeCount, recentReports],
  );

  const generateDialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="btn-generate-report" size="sm" className="gap-2">
          <Plus size={16} /> Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Generate Report</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mobile-form space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Report Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REPORT_TYPES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="period"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Period</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value ? format(field.value, "MMMM yyyy") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              data-testid="btn-submit-report"
              type="submit"
              className="w-full"
              disabled={generateReport.isPending}
            >
              Generate
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );

  return (
    <AppLayout title="">
      <PageCanvasShell
        eyebrow="Insights"
        title="Reports"
        description="Generate and download operational reports across revenue, payroll, and headcount."
        metrics={reportMetrics}
        actions={generateDialog}
      >
        <CanvasPanel title="Quick generate" icon={BarChart3}>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {REPORT_TYPES.map(({ value, label, icon: Icon, color, bg }) => (
              <button
                key={value}
                data-testid={`quick-report-${value.toLowerCase()}`}
                onClick={() => handleQuickGenerate(value, label)}
                className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-brand-md"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
                  <Icon size={18} className={color} />
                </div>
                <span className="text-center text-xs font-medium leading-tight text-foreground">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </CanvasPanel>

        <CanvasPanel title="Report history" icon={FileText} noPadding>
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : reports?.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No reports generated yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {reports?.map((report) => {
                const meta = getReportMeta(report.type ?? "");
                const Icon = meta.icon;
                const isDownloading = downloading === report.id;
                return (
                  <div
                    key={report.id}
                    data-testid={`report-row-${report.id}`}
                    className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}
                    >
                      <Icon size={16} className={meta.color} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{report.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Period: {report.period} · Generated {formatRelativeTime(report.generatedAt)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {report.type?.replace(/_/g, " ")}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleAiSummary(report)}
                      disabled={aiNarrative.isPending}
                      data-testid={`btn-ai-summary-report-${report.id}`}
                      title="Generate AI Summary"
                      className="shrink-0"
                    >
                      {aiNarrative.isPending ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Sparkles size={15} />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(report)}
                      disabled={isDownloading}
                      data-testid={`btn-download-report-${report.id}`}
                      title="Download Report"
                      className="shrink-0"
                    >
                      {isDownloading ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Download size={15} />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CanvasPanel>
      </PageCanvasShell>

      <Dialog open={aiSummaryOpen} onOpenChange={setAiSummaryOpen}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              AI Summary — {aiSummaryTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="whitespace-pre-wrap text-sm text-foreground">{aiSummaryText}</div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
