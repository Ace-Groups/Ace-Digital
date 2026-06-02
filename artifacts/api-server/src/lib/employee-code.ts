import { store } from "@workspace/db";

const EMPLOYEE_CODE_PATTERN = /^(\d{2})ACE(\d{3})$/;

export function formatEmployeeCode(year2: number, sequence: number): string {
  const yy = String(year2).padStart(2, "0").slice(-2);
  const seq = String(sequence).padStart(3, "0");
  return `${yy}ACE${seq}`;
}

export function parseEmployeeCode(code: string): { year2: number; sequence: number } | null {
  const m = code.trim().toUpperCase().match(EMPLOYEE_CODE_PATTERN);
  if (!m) return null;
  return { year2: Number(m[1]), sequence: Number(m[2]) };
}

export function year2FromDate(date: Date): number {
  return date.getFullYear() % 100;
}

export function resolveYear2(startDate?: Date | null): number {
  if (startDate && !Number.isNaN(startDate.getTime())) {
    return year2FromDate(startDate);
  }
  return year2FromDate(new Date());
}

export async function peekNextEmployeeCode(startDate?: Date | null): Promise<{
  employeeCode: string;
  year: number;
  sequence: number;
}> {
  const sequence = await store.peekEmployeeCodeSequence();
  const year = resolveYear2(startDate ?? null);
  return {
    employeeCode: formatEmployeeCode(year, sequence),
    year,
    sequence,
  };
}

export async function allocateEmployeeCode(startDate?: Date | null): Promise<string> {
  const sequence = await store.allocateEmployeeCodeSequence();
  const year = resolveYear2(startDate ?? null);
  return formatEmployeeCode(year, sequence);
}

export async function validateEmployeeCode(
  code: string,
  excludeUserId?: number,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) {
    return { ok: false, error: "Employee ID is required", status: 400 };
  }
  if (!parseEmployeeCode(trimmed)) {
    return {
      ok: false,
      error: "Employee ID must match format YYACE### (e.g. 26ACE001)",
      status: 400,
    };
  }
  const taken = await store.isEmployeeCodeTaken(trimmed, excludeUserId);
  if (taken) {
    return { ok: false, error: "Employee ID already in use", status: 409 };
  }
  return { ok: true };
}
