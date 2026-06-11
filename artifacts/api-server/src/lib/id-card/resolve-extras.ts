import { store } from "@workspace/db";
import { findInternshipByUserId } from "../internship-store";
import { sendIdCardEmail } from "../email";

export async function resolveIdCardExtras(userId: number) {
  const internship = await findInternshipByUserId(userId);
  const user = await store.findUserById(userId);
  if (!user) return null;

  const team = user.teamId != null ? await store.findTeamById(user.teamId) : null;
  const mentor =
    internship?.mentorId != null ? await store.findUserById(internship.mentorId) : null;

  return {
    user,
    extras: {
      teamName: team?.name ?? null,
      university: internship?.university ?? null,
      program: internship?.program ?? null,
      mentorName: mentor?.fullName ?? null,
      endDate: internship?.endDate ?? null,
    },
  };
}

export async function emailIdCardForUser(userId: number): Promise<boolean> {
  const resolved = await resolveIdCardExtras(userId);
  if (!resolved) return false;

  return sendIdCardEmail({
    to: resolved.user.email,
    fullName: resolved.user.fullName,
    user: resolved.user,
    extras: resolved.extras,
  });
}
