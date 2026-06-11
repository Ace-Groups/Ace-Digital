import { CheckCircle2, Circle, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InternshipStep } from "@/lib/internships-api";

const STEP_LABELS: Record<InternshipStep, string> = {
  application_received: "Application",
  hr_review: "HR review",
  account_created: "Account created",
  onboarding_email_sent: "Onboarding email",
  id_card_generated: "ID card generated",
  id_card_emailed: "ID card emailed",
  mentor_assigned: "Mentor assigned",
  workspace_ready: "Workspace ready",
  completed: "Completed",
};

const ORDER: InternshipStep[] = [
  "application_received",
  "hr_review",
  "account_created",
  "onboarding_email_sent",
  "id_card_generated",
  "id_card_emailed",
  "mentor_assigned",
  "workspace_ready",
  "completed",
];

type InternPipelineStepperProps = {
  currentStep: InternshipStep;
  completedSteps: InternshipStep[];
  compact?: boolean;
};

export function InternPipelineStepper({
  currentStep,
  completedSteps,
  compact,
}: InternPipelineStepperProps) {
  const completed = new Set(completedSteps);

  return (
    <ol className={cn("grid gap-2", compact ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3")}>
      {ORDER.map((step) => {
        const done = completed.has(step);
        const current = currentStep === step || (!done && ORDER.indexOf(step) === ORDER.findIndex((s) => !completed.has(s) && s === currentStep));
        const isCurrent = step === currentStep;

        return (
          <li
            key={step}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
              done && "border-emerald-500/30 bg-emerald-500/5",
              isCurrent && !done && "border-primary/40 bg-primary/5",
              !done && !isCurrent && "border-border/50 bg-muted/20",
            )}
          >
            {done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : isCurrent ? (
              <CircleDot className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className={cn(done && "text-foreground", isCurrent && "font-medium")}>
              {STEP_LABELS[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
