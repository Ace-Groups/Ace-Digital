import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AttendanceCheckCard } from "@/components/attendance/AttendanceCheckCard";
import { ConnectedFaceReviews } from "@/components/accountability/FaceReviewQueue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getListTeamsQueryKey, useListTeams } from "@workspace/api-client-react";
import {
  downloadMonthCsv,
  formatIst,
  getAttendanceSettings,
  getDayAudit,
  getMonth,
  getRoster,
  overrideDay,
  saveAttendanceSettings,
  STATUS_LABEL,
  type AttendanceSettings,
  type AttendanceStatus,
  type AuditEntry,
  type DayView,
  type MonthResponse,
  type RosterResponse,
} from "@/lib/attendance-api";

const ROSTER_ROLES = new Set(["super_admin", "management", "hr", "finance"]);
const OVERRIDE_ROLES = new Set(["super_admin", "management", "hr"]);
const SETTINGS_ROLES = new Set(["super_admin", "management"]);
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const OVERRIDE_STATUSES: AttendanceStatus[] = ["present", "late", "half_day", "absent", "on_leave", "off"];

function currentMonth(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

function currentDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function AttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canRoster = user?.role ? ROSTER_ROLES.has(user.role) : false;
  const canOverride = user?.role ? OVERRIDE_ROLES.has(user.role) : false;
  const canSettings = user?.role ? SETTINGS_ROLES.has(user.role) : false;
  const { data: teams } = useListTeams({
    query: { queryKey: getListTeamsQueryKey(), enabled: canRoster },
  });

  const [date, setDate] = useState(currentDate);
  const [teamId, setTeamId] = useState<number | "">("");
  const [roster, setRoster] = useState<RosterResponse | null>(null);
  const [month, setMonth] = useState(currentMonth);
  const [employeeId, setEmployeeId] = useState<number | null>(user?.id ?? null);
  const [report, setReport] = useState<MonthResponse | null>(null);
  const [selected, setSelected] = useState<DayView | null>(null);
  const [reason, setReason] = useState("");
  const [overrideStatus, setOverrideStatus] = useState<AttendanceStatus>("present");
  const [settings, setSettings] = useState<AttendanceSettings | null>(null);
  const [holiday, setHoliday] = useState("");
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  useEffect(() => {
    if (user?.id && employeeId == null) setEmployeeId(user.id);
  }, [user?.id, employeeId]);

  useEffect(() => {
    if (!canRoster) return;
    let cancelled = false;
    getRoster(date, teamId === "" ? null : teamId)
      .then((next) => {
        if (!cancelled) setRoster(next);
      })
      .catch((err: Error) => toast({ title: err.message, variant: "destructive" }));
    return () => {
      cancelled = true;
    };
  }, [canRoster, date, teamId, toast]);

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    getMonth(month, employeeId)
      .then((next) => {
        if (!cancelled) setReport(next);
      })
      .catch((err: Error) => toast({ title: err.message, variant: "destructive" }));
    return () => {
      cancelled = true;
    };
  }, [employeeId, month, toast]);

  useEffect(() => {
    if (!selected) {
      setAudit([]);
      return;
    }
    let cancelled = false;
    getDayAudit(selected.userId, selected.date)
      .then((rows) => {
        if (!cancelled) setAudit(rows);
      })
      .catch(() => {
        if (!cancelled) setAudit([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  useEffect(() => {
    if (!canSettings) return;
    getAttendanceSettings()
      .then(setSettings)
      .catch(() => undefined);
  }, [canSettings]);

  const counts = roster?.counts;
  const employees = useMemo(() => roster?.people ?? [], [roster]);

  async function applyOverride() {
    if (!selected) return;
    try {
      const next = await overrideDay(selected.userId, selected.date, overrideStatus, reason);
      setReport(next);
      const updated = next.days.find((day) => day.date === selected.date);
      if (updated) setSelected(updated);
      setAudit(await getDayAudit(selected.userId, selected.date));
      setReason("");
      toast({ title: "Attendance updated" });
      if (canRoster) setRoster(await getRoster(date, teamId === "" ? null : teamId));
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Could not save", variant: "destructive" });
    }
  }

  async function saveSettings() {
    if (!settings) return;
    try {
      setSettings(await saveAttendanceSettings(settings));
      toast({ title: "Attendance settings saved" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Could not save settings", variant: "destructive" });
    }
  }

  return (
    <AppLayout title="Attendance">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <AttendanceCheckCard />

        {canRoster && (
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Morning roster</h2>
                <p className="text-sm text-muted-foreground">Everyone's status for the day, India time.</p>
              </div>
              <div className="flex gap-2">
                <Input type="date" className="min-h-11 w-40" value={date} onChange={(e) => setDate(e.target.value)} />
                <select
                  className="min-h-11 rounded-md border border-input bg-background px-2 text-sm"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : "")}
                  aria-label="Filter by team"
                >
                  <option value="">All teams</option>
                  {(teams ?? []).map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {counts && (
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm sm:grid-cols-6">
                {(
                  [
                    ["present", "Present"],
                    ["late", "Late"],
                    ["half_day", "Half"],
                    ["absent", "Absent"],
                    ["on_leave", "Leave"],
                    ["not_in", "Not in"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="rounded-xl bg-muted/50 px-2 py-2">
                    <div className="text-lg font-semibold">{counts[key]}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            )}
            {canOverride && (
              <div className="mt-4">
                <ConnectedFaceReviews />
              </div>
            )}
            <ul className="mt-3 divide-y divide-border">
              {employees.map((person) => (
                <li key={person.userId} className="flex items-start justify-between gap-3 py-3">
                  <button
                    type="button"
                    className="min-w-0 text-left"
                    onClick={() => {
                      setEmployeeId(person.userId);
                      setSelected(person);
                    }}
                  >
                    <p className="font-medium">{person.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {person.teamName ?? "No team"} · {formatIst(person.checkInAt)}
                      {person.planNote ? ` · ${person.planNote}` : ""}
                      {person.faceMatchResult === "review" || person.faceReviewStatus === "pending"
                        ? " · Face in review"
                        : person.faceMatchResult === "match"
                          ? " · Face matched"
                          : ""}
                    </p>
                  </button>
                  <span className="shrink-0 text-sm font-medium">{STATUS_LABEL[person.status]}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Month</h2>
              <p className="text-sm text-muted-foreground">
                {report?.user.fullName ?? "Your"} attendance. Off days are not absences.
              </p>
            </div>
            <div className="flex gap-2">
              <Input type="month" className="min-h-11 w-40" value={month} onChange={(e) => setMonth(e.target.value)} />
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() =>
                  downloadMonthCsv(month, employeeId ?? undefined).catch((err: Error) =>
                    toast({ title: err.message, variant: "destructive" }),
                  )
                }
              >
                CSV
              </Button>
            </div>
          </div>
          {report && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <Total label="Present" value={report.totals.presentDays} />
              <Total label="Late" value={report.totals.lateCount} />
              <Total label="Half days" value={report.totals.halfDays} />
              <Total label="Absences" value={report.totals.absences} />
            </div>
          )}
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
            {WEEKDAYS.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {report && <GridPad start={report.days[0]?.date} />}
            {report?.days.map((day) => (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelected(day)}
                className={`min-h-11 rounded-lg border text-xs ${
                  selected?.date === day.date && selected.userId === day.userId
                    ? "border-primary bg-primary/10"
                    : "border-transparent bg-muted/40"
                }`}
              >
                <div>{Number(day.date.slice(8))}</div>
                <div className="font-medium">{shortStatus(day.status)}</div>
              </button>
            ))}
          </div>
          {selected && (
            <div className="mt-4 rounded-xl bg-muted/40 p-3 text-sm">
              <p className="font-medium">
                {selected.date} · {STATUS_LABEL[selected.status]}
              </p>
              <p className="text-muted-foreground">
                In {formatIst(selected.checkInAt)} · Out {formatIst(selected.checkOutAt)}
              </p>
              {selected.planNote && <p className="mt-1">Plan: {selected.planNote}</p>}
              {selected.overrideReason && (
                <p className="mt-1 text-muted-foreground">Correction: {selected.overrideReason}</p>
              )}
              {audit.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {audit.map((row) => (
                    <li key={row.id}>
                      {formatIst(row.at)} · {row.action.replaceAll("_", " ")}
                      {row.afterStatus ? ` → ${row.afterStatus.replaceAll("_", " ")}` : ""}
                      {row.reason ? ` · ${row.reason}` : ""}
                    </li>
                  ))}
                </ul>
              )}
              {canOverride && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <select
                    className="min-h-11 rounded-md border border-input bg-background px-2"
                    value={overrideStatus}
                    onChange={(e) => setOverrideStatus(e.target.value as AttendanceStatus)}
                    aria-label="Corrected status"
                  >
                    {OVERRIDE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABEL[status]}
                      </option>
                    ))}
                  </select>
                  <Input
                    className="min-h-11"
                    placeholder="Reason for the correction"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <Button className="min-h-11" onClick={applyOverride}>
                    Save
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>

        {canSettings && settings && (
          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-base font-semibold">Office hours and days off</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Office start
                <Input
                  type="time"
                  className="mt-1 min-h-11"
                  value={settings.officeStart}
                  onChange={(e) => setSettings({ ...settings, officeStart: e.target.value })}
                />
              </label>
              <label className="text-sm">
                Grace minutes
                <Input
                  type="number"
                  className="mt-1 min-h-11"
                  value={settings.graceMinutes}
                  onChange={(e) => setSettings({ ...settings, graceMinutes: Number(e.target.value) })}
                />
              </label>
              <label className="text-sm">
                Half day if shorter than (hours)
                <Input
                  type="number"
                  className="mt-1 min-h-11"
                  value={settings.halfDayMinHours}
                  onChange={(e) => setSettings({ ...settings, halfDayMinHours: Number(e.target.value) })}
                />
              </label>
              <label className="text-sm">
                Absent if no check-in by
                <Input
                  type="time"
                  className="mt-1 min-h-11"
                  value={settings.absentCutoff}
                  onChange={(e) => setSettings({ ...settings, absentCutoff: e.target.value })}
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {WEEKDAYS.map((label, index) => {
                const on = settings.weeklyOff.includes(index);
                return (
                  <button
                    key={label}
                    type="button"
                    className={`min-h-11 rounded-full px-3 text-sm ${on ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    onClick={() =>
                      setSettings({
                        ...settings,
                        weeklyOff: on
                          ? settings.weeklyOff.filter((day) => day !== index)
                          : [...settings.weeklyOff, index].sort(),
                      })
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <Input type="date" className="min-h-11" value={holiday} onChange={(e) => setHoliday(e.target.value)} />
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => {
                  if (!holiday || settings.holidays.includes(holiday)) return;
                  setSettings({ ...settings, holidays: [...settings.holidays, holiday].sort() });
                  setHoliday("");
                }}
              >
                Add holiday
              </Button>
            </div>
            <ul className="mt-2 text-sm text-muted-foreground">
              {settings.holidays.map((day) => (
                <li key={day} className="flex items-center justify-between py-1">
                  {day}
                  <button
                    type="button"
                    className="text-primary"
                    onClick={() =>
                      setSettings({ ...settings, holidays: settings.holidays.filter((item) => item !== day) })
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <Button className="mt-3 min-h-11" onClick={saveSettings}>
              Save settings
            </Button>
          </section>
        )}
      </div>
    </AppLayout>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/50 px-3 py-2">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function shortStatus(status: AttendanceStatus): string {
  if (status === "present") return "P";
  if (status === "late") return "L";
  if (status === "half_day") return "H";
  if (status === "absent") return "A";
  if (status === "on_leave") return "LV";
  if (status === "off") return "Off";
  return "·";
}

function GridPad({ start }: { start?: string }) {
  if (!start) return null;
  const noon = new Date(`${start}T06:30:00.000Z`);
  const label = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "short" }).format(noon);
  const index = WEEKDAYS.indexOf(label);
  if (index <= 0) return null;
  return (
    <>
      {Array.from({ length: index }, (_, i) => (
        <div key={i} />
      ))}
    </>
  );
}
