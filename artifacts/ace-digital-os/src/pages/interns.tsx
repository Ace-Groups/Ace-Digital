import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { CanvasPanel, PageCanvasShell } from "@/components/canvas";
import { InternOnboardingSheet } from "@/components/interns/InternOnboardingSheet";
import { InternPipelineStepper } from "@/components/interns/InternPipelineStepper";
import { IdCardPreview } from "@/components/id-card/IdCardPreview";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/contexts/AuthContext";
import {
  getMyInternship,
  listInternships,
  type InternshipRecord,
} from "@/lib/internships-api";
import { IssueCertificateDialog } from "@/components/credentials/IssueCertificateDialog";
import { CertificateList } from "@/components/credentials/CertificateList";
import {
  GraduationCap,
  IdCard,
  Mail,
  Plus,
  Sparkles,
  Users,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function InternsPage() {
  const { can } = usePermissions();
  const { user } = useAuth();
  const canManage = can("employees:write");
  const isSelfOnly = !can("employees:read") && can("employees:read_self");

  const [onboardOpen, setOnboardOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const canIssueCert = can("certificates:issue");

  const listQuery = useQuery({
    queryKey: ["/api/v1/internships"],
    queryFn: listInternships,
    enabled: canManage,
  });

  const meQuery = useQuery({
    queryKey: ["/api/v1/internships/me"],
    queryFn: getMyInternship,
    enabled: isSelfOnly,
    retry: false,
  });

  const internships = listQuery.data ?? [];
  const myInternship = meQuery.data;

  const selected: InternshipRecord | null = useMemo(() => {
    if (isSelfOnly && myInternship) return myInternship;
    if (selectedId != null) return internships.find((i) => i.id === selectedId) ?? null;
    return internships[0] ?? null;
  }, [isSelfOnly, myInternship, selectedId, internships]);

  useEffect(() => {
    if (!isSelfOnly && internships.length && selectedId == null) {
      setSelectedId(internships[0]!.id);
    }
  }, [internships, isSelfOnly, selectedId]);

  const activeCount = internships.filter((i) => i.status === "active").length;
  const pipelineCount = internships.filter((i) => i.status === "pipeline").length;

  const metrics = useMemo(
    () =>
      canManage
        ? [
            {
              key: "total",
              label: "Interns",
              value: internships.length,
              icon: Users,
              iconBg: "bg-primary/10",
              iconColor: "text-primary",
            },
            {
              key: "active",
              label: "Active",
              value: activeCount,
              icon: Sparkles,
              iconBg: "bg-emerald-500/10",
              iconColor: "text-emerald-600 dark:text-emerald-400",
            },
            {
              key: "pipeline",
              label: "In pipeline",
              value: pipelineCount,
              icon: GraduationCap,
              iconBg: "bg-teal-500/10",
              iconColor: "text-teal-600 dark:text-teal-400",
            },
          ]
        : myInternship
          ? [
              {
                key: "program",
                label: "Program",
                value: myInternship.program ?? "Internship",
                icon: GraduationCap,
                iconBg: "bg-teal-500/10",
                iconColor: "text-teal-600 dark:text-teal-400",
              },
              {
                key: "mentor",
                label: "Mentor",
                value: myInternship.mentorName ?? "TBD",
                icon: Users,
                iconBg: "bg-primary/10",
                iconColor: "text-primary",
              },
              {
                key: "status",
                label: "Status",
                value: myInternship.status,
                icon: IdCard,
                iconBg: "bg-amber-500/10",
                iconColor: "text-amber-600 dark:text-amber-400",
              },
            ]
          : [],
    [canManage, internships.length, activeCount, pipelineCount, myInternship],
  );

  const loading = canManage ? listQuery.isLoading : meQuery.isLoading;

  return (
    <AppLayout title="">
      <PageCanvasShell
        eyebrow="People"
        title={isSelfOnly ? "Intern Hub" : "Intern Onboarding"}
        description={
          isSelfOnly
            ? "Your internship progress, ID card, and workspace access."
            : "Launch intern accounts, track the onboarding pipeline, and deliver ID cards automatically."
        }
        metrics={metrics}
        actions={
          canManage ? (
            <Button size="sm" className="gap-2" onClick={() => setOnboardOpen(true)}>
              <Plus size={16} />
              Onboard intern
            </Button>
          ) : undefined
        }
      >
        {loading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : isSelfOnly && !myInternship ? (
          <CanvasPanel title="No internship record" icon={GraduationCap}>
            <p className="text-sm text-muted-foreground">
              Your account is not linked to an active internship program. Contact HR if you believe
              this is an error.
            </p>
          </CanvasPanel>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            {canManage && (
              <CanvasPanel title="Intern directory" icon={Users} noPadding>
                <div className="divide-y divide-border">
                  {internships.length === 0 ? (
                    <p className="p-6 text-sm text-muted-foreground">
                      No interns yet. Start the onboarding pipeline to create the first intern
                      account.
                    </p>
                  ) : (
                    internships.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                          selected?.id === item.id && "bg-primary/5",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">{item.intern?.fullName ?? `User #${item.userId}`}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.program} · {item.university ?? "—"}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 capitalize text-[10px]">
                          {item.status}
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              </CanvasPanel>
            )}

            {selected && (
              <>
                <CanvasPanel
                  title="Onboarding pipeline"
                  icon={Sparkles}
                  headerRight={
                    selected.completedSteps.includes("id_card_emailed") ? (
                      <Badge className="gap-1 bg-emerald-600">
                        <Mail size={12} />
                        ID card sent
                      </Badge>
                    ) : null
                  }
                >
                  <InternPipelineStepper
                    currentStep={selected.currentStep}
                    completedSteps={selected.completedSteps}
                  />
                  {selected.intern && (
                    <div className="mt-4 rounded-lg border border-border/60 bg-muted/20 p-3 text-sm space-y-3">
                      <div>
                        <p className="font-medium">{selected.intern.fullName}</p>
                        <p className="text-muted-foreground">{selected.intern.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Code {selected.intern.employeeCode} · {selected.intern.teamName ?? "No team"}
                        </p>
                      </div>
                      <CertificateList internshipId={selected.id} userId={selected.userId} />
                      {canIssueCert && (
                        <Button size="sm" className="gap-2" onClick={() => setIssueOpen(true)}>
                          <Award size={14} />
                          Issue certificate
                        </Button>
                      )}
                    </div>
                  )}
                </CanvasPanel>

                {selected.intern?.id != null && (
                  <div className="lg:col-span-2">
                    <CanvasPanel title="Digital ID card" icon={IdCard}>
                      <IdCardPreview
                        employeeId={selected.intern.id}
                        canEmail={canManage}
                      />
                    </CanvasPanel>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </PageCanvasShell>

      <InternOnboardingSheet open={onboardOpen} onOpenChange={setOnboardOpen} />
      {selected && (
        <IssueCertificateDialog
          open={issueOpen}
          onOpenChange={setIssueOpen}
          internshipId={selected.id}
          internName={selected.intern?.fullName ?? "Intern"}
          onIssued={() => listQuery.refetch()}
        />
      )}
    </AppLayout>
  );
}
