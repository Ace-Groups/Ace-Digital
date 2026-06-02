import type { User } from "@workspace/db";
import type { AccessContext } from "@workspace/db";
import { canViewSalaries, stripSalaryFields } from "@workspace/rbac";
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
  return canViewSalaries(ctx) ? row : stripSalaryFields(row);
}
