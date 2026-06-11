import { store } from "@workspace/db";
import {
  advanceInternshipStep,
  type InternshipRecord,
  type InternshipStep,
} from "./internship-store";
import { buildIdCardDataFromUser, renderIdCardPair } from "./id-card";
import {
  sendInternOnboardingSequence,
  sendIdCardEmail,
  sendOnboardingSequence,
} from "./email";

export type RunPipelineResult = {
  internship: InternshipRecord;
  stepsCompleted: InternshipStep[];
  idCardEmailed: boolean;
  onboardingEmailed: boolean;
};

async function markStep(internshipId: number, step: InternshipStep): Promise<InternshipRecord | null> {
  return advanceInternshipStep(internshipId, step);
}

/**
 * Runs the post-account-creation pipeline: onboarding emails, ID card generation, and email delivery.
 */
export async function runInternshipPipeline(
  internshipId: number,
  opts: { password: string; isIntern: boolean },
): Promise<RunPipelineResult> {
  const internship = await import("./internship-store").then((m) => m.findInternshipById(internshipId));
  if (!internship) throw new Error("Internship not found");

  const user = await store.findUserById(internship.userId);
  if (!user) throw new Error("Intern user not found");

  const stepsCompleted: InternshipStep[] = [];
  let onboardingEmailed = false;
  let idCardEmailed = false;

  let current = internship;

  if (!current.completedSteps.includes("account_created")) {
    current = (await markStep(internshipId, "account_created")) ?? current;
    stepsCompleted.push("account_created");
  }

  const mentor =
    current.mentorId != null ? await store.findUserById(current.mentorId) : null;
  const team = user.teamId != null ? await store.findTeamById(user.teamId) : null;

  if (!current.completedSteps.includes("onboarding_email_sent")) {
    if (opts.isIntern) {
      const result = await sendInternOnboardingSequence({
        to: user.email,
        fullName: user.fullName,
        email: user.email,
        password: opts.password,
        program: current.program ?? "Ace Digital Internship",
        university: current.university ?? undefined,
        mentorName: mentor?.fullName,
        startDate: current.startDate ?? undefined,
        endDate: current.endDate ?? undefined,
      });
      onboardingEmailed =
        result.welcomeSent && result.guideSent && result.credentialsSent;
    } else {
      const result = await sendOnboardingSequence({
        to: user.email,
        fullName: user.fullName,
        email: user.email,
        password: opts.password,
      });
      onboardingEmailed =
        result.welcomeSent && result.guideSent && result.credentialsSent;
    }
    current = (await markStep(internshipId, "onboarding_email_sent")) ?? current;
    stepsCompleted.push("onboarding_email_sent");
  }

  if (!current.completedSteps.includes("id_card_generated")) {
    const cardData = await buildIdCardDataFromUser(user, {
      teamName: team?.name ?? null,
      university: current.university,
      program: current.program,
      mentorName: mentor?.fullName ?? null,
      endDate: current.endDate,
    });
    renderIdCardPair(cardData);
    current = (await markStep(internshipId, "id_card_generated")) ?? current;
    stepsCompleted.push("id_card_generated");
  }

  if (!current.completedSteps.includes("id_card_emailed")) {
    idCardEmailed = await sendIdCardEmail({
      to: user.email,
      fullName: user.fullName,
      user,
      extras: {
        teamName: team?.name ?? null,
        university: current.university,
        program: current.program,
        mentorName: mentor?.fullName ?? null,
        endDate: current.endDate,
      },
    });
    current = (await markStep(internshipId, "id_card_emailed")) ?? current;
    stepsCompleted.push("id_card_emailed");
  }

  if (current.mentorId && !current.completedSteps.includes("mentor_assigned")) {
    current = (await markStep(internshipId, "mentor_assigned")) ?? current;
    stepsCompleted.push("mentor_assigned");
  }

  if (!current.completedSteps.includes("workspace_ready")) {
    current = (await markStep(internshipId, "workspace_ready")) ?? current;
    stepsCompleted.push("workspace_ready");
  }

  return {
    internship: current,
    stepsCompleted,
    idCardEmailed,
    onboardingEmailed,
  };
}
