import { useEffect, useState } from "react";
import { Link } from "wouter";
import { getGetFinanceSummaryQueryKey, getGetMyPayslipQueryKey, getListTasksQueryKey, useGetFinanceSummary, useGetMyPayslip, useListTasks } from "@workspace/api-client-react";
import { AttendanceCheckCard } from "@/components/attendance/AttendanceCheckCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getRoster, type RosterResponse } from "@/lib/attendance-api";
import { formatCurrency } from "@/lib/utils";
import { getGreeting, useDashboardPage } from "./useDashboardPage";

const ROSTER_ROLES = new Set(["super_admin", "management", "hr"]);
const PAY_ROLES = new Set(["super_admin", "management", "finance"]);

function taskName(title: string): string {
  return title.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim() || "Work";
}

function kolkataDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function ActionRow({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="font-medium">{title}</span>
        <span className="text-sm text-muted-foreground">{detail}</span>
      </Link>
    </li>
  );
}

export function RoleHome() {
  const { user, dash, isLoading, firstName, dashboardDate } = useDashboardPage();
  const role = user?.role ?? "employee";
  const isRoster = ROSTER_ROLES.has(role);
  const isPay = PAY_ROLES.has(role);
  const taskParams = isRoster ? undefined : user?.id ? { assigneeId: user.id } : undefined;
  const { data: tasks, isLoading: tasksLoading } = useListTasks(taskParams, {
    query: { queryKey: getListTasksQueryKey(taskParams), enabled: Boolean(user?.id) },
  });
  const { data: finance } = useGetFinanceSummary({
    query: { queryKey: getGetFinanceSummaryQueryKey(), enabled: isPay },
  });
  const { data: payslip } = useGetMyPayslip({
    query: { queryKey: getGetMyPayslipQueryKey(), enabled: role === "employee" },
  });
  const [roster, setRoster] = useState<RosterResponse | null>(null);
  const [rosterError, setRosterError] = useState(false);

  useEffect(() => {
    if (!isRoster) return;
    let cancelled = false;
    getRoster(kolkataDate())
      .then((next) => {
        if (!cancelled) setRoster(next);
      })
      .catch(() => {
        if (!cancelled) setRosterError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isRoster]);

  const today = kolkataDate();
  const openTasks = (tasks ?? []).filter((task) => task.status !== "DONE").slice(0, 4);
  const overdueCount = (tasks ?? []).filter((task) => {
    if (task.status === "DONE" || !task.dueDate) return false;
    return task.dueDate.slice(0, 10) < today;
  }).length;
  const counts = roster?.counts;
  const rosterOrder = ["late", "not_in", "on_leave", "absent", "half_day", "present", "off"];
  const rosterPeople = [...(roster?.people ?? [])].sort(
    (a, b) => rosterOrder.indexOf(a.status) - rosterOrder.indexOf(b.status),
  );
  const digest = counts
    ? `${counts.present} in · ${counts.late} late · ${counts.on_leave} on leave · ${counts.not_in} not in yet`
    : rosterError
      ? "Today's roster did not load. Open the roster to try again."
      : "Loading who is in.";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 pb-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {getGreeting()}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{dashboardDate}</p>
      </header>

      <AttendanceCheckCard />

      {isRoster ? (
        <section aria-labelledby="today-heading">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 id="today-heading" className="text-base font-semibold">
              Today
            </h2>
            <Link href="/attendance" className="inline-flex min-h-11 items-center text-sm font-medium text-primary">
              Open roster
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">{digest}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading ? "Checking what is waiting." : `${dash?.pendingApprovalsCount ?? 0} approvals waiting`}
            {" · "}
            {tasksLoading ? "…" : `${overdueCount} overdue`}
          </p>
          {!roster && !rosterError ? (
            <Skeleton className="mt-3 h-24 w-full" />
          ) : (
            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {rosterPeople.slice(0, 8).map((person) => (
                <li key={person.userId} className="flex min-h-11 items-center justify-between gap-3 px-4 py-2">
                  <span className="min-w-0 truncate font-medium">{person.fullName}</span>
                  <span className="shrink-0 text-sm text-muted-foreground">{person.status.replaceAll("_", " ")}</span>
                </li>
              ))}
              {roster && roster.people.length === 0 && (
                <li className="px-4 py-6 text-sm text-muted-foreground">
                  No one is listed yet. Check-ins show up here through the morning.
                </li>
              )}
            </ul>
          )}
        </section>
      ) : (
        <section aria-labelledby="tasks-heading">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 id="tasks-heading" className="text-base font-semibold">
              Today&apos;s tasks
            </h2>
            <Link href="/tasks?new=1" className="inline-flex min-h-11 items-center text-sm font-medium text-primary">
              Submit work
            </Link>
          </div>
          {tasksLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : openTasks.length === 0 ? (
            <p className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
              Nothing is open. Submit work when you start something, and add a link if the file lives elsewhere.
            </p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {openTasks.map((task) => (
                <li key={task.id}>
                  <Link href="/tasks" className="flex min-h-11 items-center justify-between gap-3 px-4 py-2">
                    <span className="min-w-0 truncate">{taskName(task.title)}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">{task.status.replaceAll("_", " ").toLowerCase()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-label="Next actions">
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {isRoster && (
            <ActionRow
              href="/tasks"
              title="Work to review"
              detail={isLoading ? "…" : `${dash?.upcomingDeadlines?.length ?? 0} deadlines`}
            />
          )}
          <ActionRow
            href={role === "employee" ? "/approvals?new=leave" : "/approvals"}
            title={role === "employee" ? "Apply for leave" : "Pending approvals"}
            detail={isLoading ? "…" : `${dash?.pendingApprovalsCount ?? 0} waiting`}
          />
          <ActionRow
            href="/finance"
            title={role === "employee" ? "Payslip" : "Monthly pay"}
            detail={
              isPay && finance
                ? `${formatCurrency(finance.pendingPayroll)} pending`
                : payslip?.payrollStatus
                  ? payslip.payrollStatus
                  : "Open"
            }
          />
          <ActionRow href="/channels" title="Chat" detail="Open" />
        </ul>
      </section>
    </div>
  );
}
