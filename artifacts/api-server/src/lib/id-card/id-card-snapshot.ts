import type { User } from "@workspace/db";

/** Fields that appear on the employee/intern ID card. */
export function idCardUserSnapshot(user: User): string {
  return JSON.stringify({
    fullName: user.fullName,
    jobTitle: user.jobTitle,
    teamId: user.teamId,
    phone: user.phone,
    employeeCode: user.employeeCode,
    startDate: user.startDate?.toISOString() ?? null,
    bloodGroup: user.bloodGroup,
    emergencyContactName: user.emergencyContactName,
    emergencyContactPhone: user.emergencyContactPhone,
    avatarUrl: user.avatarUrl,
  });
}

export function idCardInternshipSnapshot(internship: {
  university: string | null;
  program: string | null;
  mentorId: number | null;
  startDate: string | null;
  endDate: string | null;
}): string {
  return JSON.stringify({
    university: internship.university,
    program: internship.program,
    mentorId: internship.mentorId,
    startDate: internship.startDate,
    endDate: internship.endDate,
  });
}
