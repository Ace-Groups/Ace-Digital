export type DayStatus = "present" | "late" | "half_day" | "absent" | "on_leave" | "off" | "not_in";

export type ScorecardTask = {
  dueOn: string | null;
  completedOn: string | null;
  done: boolean;
};

export type ScorecardInput = {
  userId: number;
  fullName: string;
  weekStart: string;
  weekEnd: string;
  days: { status: DayStatus }[];
  tasks: ScorecardTask[];
  reviews: { decision: "accepted" | "declined" | "pending" }[];
  pingsConfirmed: number;
  pingsMissed: number;
};

export type Scorecard = {
  userId: number;
  fullName: string;
  weekStart: string;
  weekEnd: string;
  attendanceRate: number | null;
  punctualityRate: number | null;
  tasksOnTime: number;
  tasksDue: number;
  reviewsAccepted: number;
  reviewsDecided: number;
  pingsConfirmed: number;
  pingsMissed: number;
};

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function weekBounds(date: string): { start: string; end: string } {
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const start = new Date(utc);
  start.setUTCDate(start.getUTCDate() + mondayOffset);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return { start: iso(start), end: iso(end) };
}

export function taskOnTime(task: ScorecardTask): boolean | null {
  if (!task.dueOn) return null;
  if (task.completedOn) return task.completedOn.slice(0, 10) <= task.dueOn.slice(0, 10);
  if (task.done) return true;
  return false;
}

function rate(num: number, den: number): number | null {
  if (den <= 0) return null;
  return Math.round((num / den) * 1000) / 1000;
}

export function buildScorecard(input: ScorecardInput): Scorecard {
  let present = 0;
  let late = 0;
  let half = 0;
  let absent = 0;
  for (const day of input.days) {
    if (day.status === "present") present += 1;
    else if (day.status === "late") late += 1;
    else if (day.status === "half_day") half += 1;
    else if (day.status === "absent") absent += 1;
  }
  const attended = present + late + half;
  const tasks = input.tasks.map(taskOnTime).filter((value): value is boolean => value != null);
  const decided = input.reviews.filter((review) => review.decision !== "pending");
  return {
    userId: input.userId,
    fullName: input.fullName,
    weekStart: input.weekStart,
    weekEnd: input.weekEnd,
    attendanceRate: rate(attended, attended + absent),
    punctualityRate: rate(present + half, attended),
    tasksOnTime: tasks.filter(Boolean).length,
    tasksDue: tasks.length,
    reviewsAccepted: decided.filter((review) => review.decision === "accepted").length,
    reviewsDecided: decided.length,
    pingsConfirmed: input.pingsConfirmed,
    pingsMissed: input.pingsMissed,
  };
}
