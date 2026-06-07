import type { User, Team } from "@workspace/db";

export function userToJson(user: User, team: Team | null) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
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
    dob: user.dob ? user.dob.toISOString() : null,
    address: user.address ?? null,
    notes: user.notes ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}
