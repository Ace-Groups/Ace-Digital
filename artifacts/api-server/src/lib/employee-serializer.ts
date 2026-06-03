import type { User } from "@workspace/db";
import type { AccessContext } from "@workspace/db";
import {
  canBrowseEmployeeDirectory,
  canViewSalaries,
  hasPermission,
  stripSalaryFields,
} from "@workspace/rbac";
import { store } from "@workspace/db";

export async function employeeWithProfile(user: User, ctx: AccessContext) {
  const team = user.teamId ? await store.findTeamById(user.teamId) : null;
  const profile = await store.findProfileByUserId(user.id);
  const row = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    teamId: user.teamId,
    teamName: team?.name ?? null,
    jobTitle: user.jobTitle,
    phone: user.phone ?? null,
    employeeCode: user.employeeCode ?? null,
    startDate: user.startDate ? user.startDate.toISOString() : null,
    avatarUrl: user.avatarUrl,
    status: user.status,
    mustChangePassword: user.mustChangePassword ?? false,
    baseSalary: profile?.baseSalary ? Number(profile.baseSalary) : null,
    bonus: profile?.bonus ? Number(profile.bonus) : null,
    payrollStatus: profile?.payrollStatus ?? null,
    createdAt: user.createdAt.toISOString(),
  };
  if (canViewSalaries(ctx)) return row;
  if (
    canBrowseEmployeeDirectory(ctx) &&
    !hasPermission(ctx, "employees:read")
  ) {
    return {
      id: row.id,
      fullName: row.fullName,
      avatarUrl: row.avatarUrl,
      teamId: row.teamId,
      teamName: row.teamName,
      jobTitle: row.jobTitle,
      status: row.status,
    };
  }
  return stripSalaryFields(row);
}
