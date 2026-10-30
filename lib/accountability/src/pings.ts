import { hashString } from "./liveness";
import { parseHm, withinTimeWindow } from "./geo";

export const MAX_PINGS_CAP = 3;

export type AccountabilitySettings = {
  presencePingsEnabled: boolean;
  maxPingsPerDay: number;
  minGapMinutes: number;
  responseWindowMinutes: number;
  officeStart: string;
  officeEnd: string;
  idleHours: number;
  requireDailyPlan: boolean;
};

export const DEFAULT_ACCOUNTABILITY_SETTINGS: AccountabilitySettings = {
  presencePingsEnabled: false,
  maxPingsPerDay: 2,
  minGapMinutes: 90,
  responseWindowMinutes: 15,
  officeStart: "10:00",
  officeEnd: "19:00",
  idleHours: 3,
  requireDailyPlan: false,
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function normalizeAccountabilitySettings(input: Partial<AccountabilitySettings> | null | undefined): AccountabilitySettings {
  const src = input ?? {};
  return {
    presencePingsEnabled: Boolean(src.presencePingsEnabled),
    maxPingsPerDay: clamp(src.maxPingsPerDay ?? DEFAULT_ACCOUNTABILITY_SETTINGS.maxPingsPerDay, 1, MAX_PINGS_CAP),
    minGapMinutes: clamp(src.minGapMinutes ?? DEFAULT_ACCOUNTABILITY_SETTINGS.minGapMinutes, 90, 240),
    responseWindowMinutes: clamp(
      src.responseWindowMinutes ?? DEFAULT_ACCOUNTABILITY_SETTINGS.responseWindowMinutes,
      5,
      30,
    ),
    officeStart: parseHm(src.officeStart ?? "") != null ? src.officeStart! : DEFAULT_ACCOUNTABILITY_SETTINGS.officeStart,
    officeEnd: parseHm(src.officeEnd ?? "") != null ? src.officeEnd! : DEFAULT_ACCOUNTABILITY_SETTINGS.officeEnd,
    idleHours: clamp(src.idleHours ?? DEFAULT_ACCOUNTABILITY_SETTINGS.idleHours, 1, 8),
    requireDailyPlan: Boolean(src.requireDailyPlan),
  };
}

/** Deterministic slot minutes for one person and civil date. Stable across reads. */
export function plannedSlots(userId: number, date: string, settings: AccountabilitySettings): number[] {
  const start = parseHm(settings.officeStart);
  const end = parseHm(settings.officeEnd);
  if (start == null || end == null || end <= start) return [];
  const count = Math.min(MAX_PINGS_CAP, settings.maxPingsPerDay);
  const gap = settings.minGapMinutes;
  const latestFirst = end - (count - 1) * gap;
  if (latestFirst < start) return [];
  const span = latestFirst - start;
  const seed = hashString(`${userId}:${date}:pings`);
  const first = start + (span === 0 ? 0 : seed % (span + 1));
  const slots = [first];
  for (let i = 1; i < count; i++) {
    slots.push(slots[i - 1] + gap);
  }
  return slots;
}

export type ExistingPing = { slotMinute: number; status: "pending" | "confirmed" | "missed" | "expired" };

export function pingAction(input: {
  enabled: boolean;
  slots: number[];
  nowMinutes: number;
  windowMinutes: number;
  existing: ExistingPing[];
}): { create: number[]; expire: number[] } {
  if (!input.enabled) return { create: [], expire: [] };
  const create: number[] = [];
  const expire: number[] = [];
  for (const minute of input.slots) {
    const row = input.existing.find((ping) => ping.slotMinute === minute);
    const inWindow = input.nowMinutes >= minute && input.nowMinutes < minute + input.windowMinutes;
    const past = input.nowMinutes >= minute + input.windowMinutes;
    if (!row && inWindow) create.push(minute);
    if (row && row.status === "pending" && past) expire.push(minute);
  }
  return { create, expire };
}

export function isIdle(input: {
  checkedIn: boolean;
  hasWorkLog: boolean;
  nowMinutes: number;
  officeStart: string;
  officeEnd: string;
  quietMinutes: number;
  idleHours: number;
}): boolean {
  return (
    input.checkedIn &&
    !input.hasWorkLog &&
    withinTimeWindow(input.nowMinutes, input.officeStart, input.officeEnd) &&
    input.quietMinutes >= input.idleHours * 60
  );
}
