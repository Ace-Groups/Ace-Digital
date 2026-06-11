import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { CanvasPanel, PageCanvasShell } from "@/components/canvas";
import {
  useListEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useResetEmployeePassword,
  useListTeams,
  useGetMyProfile,
  useUpdateMyProfile,
  getListEmployeesQueryKey,
  getGetMyProfileQueryKey,
  type Employee,
} from "@workspace/api-client-react";
import { canAssignRole } from "@workspace/rbac";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/UserAvatar";
import { Briefcase, IdCard, Mail, Plus, Search, ShieldCheck, Users, UserCheck, Building2 } from "lucide-react";
import { IdCardPreview } from "@/components/id-card/IdCardPreview";
import { CertificateList } from "@/components/credentials/CertificateList";
import { cn, formatCurrency, statusColor } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/use-permissions";
import {
  patchListItem,
  prependListItem,
  removeListItem,
  setList,
  snapshotList,
} from "@/lib/optimistic";
import { runOptimistic } from "@/lib/optimistic/run-optimistic";
import { EmployeeCard } from "@/components/employees/EmployeeCard";
import {
  EmployeeFormSheet,
  type EmployeeFormSubmitCreate,
  type EmployeeFormSubmitEdit,
} from "@/components/employees/EmployeeFormSheet";
import {
  EmployeePasswordResetSheet,
  type PasswordResetSubmit,
} from "@/components/employees/EmployeePasswordResetSheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseEmployeeIdentityImages } from "@/lib/avatar";
import { EmployeeProfilePhoto } from "@/components/employees/EmployeeProfilePhoto";

export default function EmployeesPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const isSelfOnly = can("employees:read_self") && !can("employees:read");
  const canWrite = can("employees:write");
  const canResetPassword = can("employees:password_reset");
  const canRemove = can("employees:delete");
  const canViewSalaries = can("finance:salaries_all");

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [viewing, setViewing] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [resetTarget, setResetTarget] = useState<Employee | null>(null);

  const { data: employees, isLoading } = useListEmployees(undefined, {
    query: { enabled: !isSelfOnly, queryKey: getListEmployeesQueryKey() },
  });
  const { data: meProfile, isLoading: meLoading } = useGetMyProfile({
    query: { enabled: isSelfOnly, queryKey: getGetMyProfileQueryKey() },
  });
  const { data: teams } = useListTeams();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const resetPassword = useResetEmployeePassword();
  const updateMyProfile = useUpdateMyProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const assignableRoles = useMemo(() => {
    if (!user) return ["employee"];
    return [
      "employee",
      "team_lead",
      "finance",
      "hr",
      "management",
      "client_manager",
      "super_admin",
    ].filter((r) => canAssignRole(user.role, r));
  }, [user]);

  const filtered = employees?.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.fullName.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      (e.teamName ?? "").toLowerCase().includes(q) ||
      (e.employeeCode ?? "").toLowerCase().includes(q)
    );
  });

  const totalEmployees = employees?.length ?? 0;
  const activeEmployees = employees?.filter((e) => e.status !== "inactive").length ?? 0;
  const teamCount = useMemo(
    () => new Set(employees?.map((e) => e.teamName ?? "Unassigned")).size,
    [employees],
  );

  const employeeMetrics = useMemo(
    () => [
      {
        key: "total",
        label: "Total employees",
        value: totalEmployees,
        icon: Users,
        iconBg: "bg-primary/10",
        iconColor: "text-primary",
      },
      {
        key: "active",
        label: "Active",
        value: activeEmployees,
        icon: UserCheck,
        iconBg: "bg-emerald-500/10",
        iconColor: "text-emerald-600 dark:text-emerald-400",
      },
      {
        key: "teams",
        label: "Teams",
        value: teamCount,
        icon: Building2,
        iconBg: "bg-sky-500/10",
        iconColor: "text-sky-600 dark:text-sky-400",
      },
    ],
    [totalEmployees, activeEmployees, teamCount],
  );

  const profileMetrics = useMemo(
    () =>
      meProfile
        ? [
            {
              key: "role",
              label: "Role",
              value: meProfile.role?.replace(/_/g, " ") ?? "—",
              icon: Briefcase,
              iconBg: "bg-primary/10",
              iconColor: "text-primary",
            },
            {
              key: "team",
              label: "Team",
              value: meProfile.teamName ?? "No team",
              icon: Building2,
              iconBg: "bg-sky-500/10",
              iconColor: "text-sky-600 dark:text-sky-400",
            },
            {
              key: "status",
              label: "Status",
              value: meProfile.status ?? "active",
              icon: UserCheck,
              iconBg: "bg-emerald-500/10",
              iconColor: "text-emerald-600 dark:text-emerald-400",
            },
          ]
        : [],
    [meProfile],
  );

  async function handleCreate(data: EmployeeFormSubmitCreate) {
    const employeesKey = getListEmployeesQueryKey();
    const tempId = -Date.now();
    setCreateOpen(false);
    try {
      const result = await runOptimistic({
        apply: () => {
          const prev = snapshotList<Employee>(queryClient, employeesKey);
          prependListItem(queryClient, employeesKey, {
            id: tempId,
            fullName: data.fullName,
            email: data.email,
            role: data.role,
            teamId: data.teamId ?? null,
            jobTitle: data.jobTitle ?? null,
            status: data.status,
            avatarUrl: data.avatarUrl ?? null,
            dob: data.dob ?? null,
            address: data.address ?? null,
            addressLine2: data.addressLine2 ?? null,
            city: data.city ?? null,
            state: data.state ?? null,
            zipCode: data.zipCode ?? null,
            country: data.country ?? null,
            gender: data.gender ?? null,
            maritalStatus: data.maritalStatus ?? null,
            nationality: data.nationality ?? null,
            aadhaarNumber: data.aadhaarNumber ?? null,
            emergencyContactName: data.emergencyContactName ?? null,
            emergencyContactPhone: data.emergencyContactPhone ?? null,
            highestQualification: data.highestQualification ?? null,
            bloodGroup: data.bloodGroup ?? null,
            aadhaarDocument: data.aadhaarDocument ?? null,
            notes: data.notes ?? null,
            createdAt: new Date().toISOString(),
          } as Employee);
          return prev;
        },
        rollback: (prev) => setList(queryClient, employeesKey, prev),
        commit: () =>
          createEmployee.mutateAsync({
            data: {
              fullName: data.fullName,
              email: data.email,
              role: data.role,
              teamId: data.teamId,
              jobTitle: data.jobTitle,
              phone: data.phone,
              employeeCode: data.employeeCode,
              startDate: data.startDate,
              status: data.status,
              baseSalary: data.baseSalary,
              bonus: data.bonus,
              salaryMode: data.salaryMode,
              passwordMode: data.passwordMode,
              password: data.password,
              sendWelcomeEmail: data.sendWelcomeEmail,
              avatarUrl: data.avatarUrl,
              dob: data.dob,
              address: data.address ?? undefined,
              addressLine2: data.addressLine2 ?? undefined,
              city: data.city ?? undefined,
              state: data.state ?? undefined,
              zipCode: data.zipCode ?? undefined,
              country: data.country ?? undefined,
              gender: data.gender ?? undefined,
              maritalStatus: data.maritalStatus ?? undefined,
              nationality: data.nationality ?? undefined,
              aadhaarNumber: data.aadhaarNumber ?? undefined,
              emergencyContactName: data.emergencyContactName ?? undefined,
              emergencyContactPhone: data.emergencyContactPhone ?? undefined,
              highestQualification: data.highestQualification ?? undefined,
              bloodGroup: data.bloodGroup ?? undefined,
              aadhaarDocument: data.aadhaarDocument ?? undefined,
              notes: data.notes ?? undefined,
            },
          }),
        reconcile: () => {
          void queryClient.invalidateQueries({ queryKey: employeesKey });
        },
      });
      toast({
        title: "Employee created",
        description: result.emailSent
          ? "Welcome email sent with login details."
          : "Account created (email not sent).",
      });
    } catch {
      toast({ title: "Could not create employee", variant: "destructive" });
    }
  }

  async function handleEdit(data: EmployeeFormSubmitEdit) {
    if (!editing) return;
    const roleUnchanged = data.role === editing.role;
    const patchBody = {
      fullName: data.fullName,
      email: data.email,
      ...(roleUnchanged ? {} : { role: data.role }),
      teamId: data.teamId,
      jobTitle: data.jobTitle,
      phone: data.phone,
      employeeCode: data.employeeCode,
      startDate: data.startDate,
      status: data.status,
      baseSalary: data.baseSalary,
      bonus: data.bonus,
      salaryMode: data.salaryMode,
      payrollStatus: data.payrollStatus,
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      dob: data.dob,
      address: data.address,
      addressLine2: data.addressLine2,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      country: data.country,
      gender: data.gender,
      maritalStatus: data.maritalStatus,
      nationality: data.nationality,
      aadhaarNumber: data.aadhaarNumber,
      emergencyContactName: data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
      highestQualification: data.highestQualification,
      bloodGroup: data.bloodGroup,
      aadhaarDocument: data.aadhaarDocument,
      notes: data.notes,
    };
    const employeesKey = getListEmployeesQueryKey();
    const employeeId = editing.id;
    setEditOpen(false);
    setEditing(null);
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<Employee>(queryClient, employeesKey);
          patchListItem(queryClient, employeesKey, employeeId, (e) => ({
            ...e,
            ...patchBody,
          }));
          return prev;
        },
        rollback: (prev) => setList(queryClient, employeesKey, prev),
        commit: () => updateEmployee.mutateAsync({ id: employeeId, data: patchBody }),
        reconcile: () => {
          void queryClient.invalidateQueries({ queryKey: employeesKey });
        },
      });
      toast({ title: "Employee updated" });
    } catch {
      toast({ title: "Could not save changes", variant: "destructive" });
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const employeesKey = getListEmployeesQueryKey();
    const id = deleteTarget.id;
    setDeleteTarget(null);
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<Employee>(queryClient, employeesKey);
          removeListItem(queryClient, employeesKey, id);
          return prev;
        },
        rollback: (prev) => setList(queryClient, employeesKey, prev),
        commit: () => deleteEmployee.mutateAsync({ id }),
      });
      toast({
        title: "Employee offboarded",
        description: "Login and profile records were removed. A limited deletion audit snapshot was retained.",
      });
    } catch {
      toast({ title: "Could not delete employee", variant: "destructive" });
    }
  }

  async function handlePasswordReset(data: PasswordResetSubmit) {
    if (!resetTarget) return;
    try {
      const result = await resetPassword.mutateAsync({
        id: resetTarget.id,
        data: {
          mode: data.mode,
          password: data.password,
          sendWelcomeEmail: data.sendWelcomeEmail,
        },
      });
      setResetTarget(null);
      toast({
        title:
          data.mode === "email"
            ? result.emailSent
              ? "Reset email sent"
              : "Password reset  email not sent"
            : "Password updated",
        description: result.emailSent
          ? "The employee should receive their new temporary password shortly. Check spam if it does not arrive."
          : data.mode === "email"
            ? "Password was changed on the server, but the email could not be delivered. Share the new password manually or check RESEND_API_KEY on the API."
            : "Share the new password with the employee securely.",
        variant: data.mode === "email" && !result.emailSent ? "destructive" : undefined,
      });
    } catch (err) {
      toast({
        title: "Could not reset password",
        description:
          err instanceof Error ? err.message : "Something went wrong. Try again.",
        variant: "destructive",
      });
    }
  }

  if (isSelfOnly) {
    return (
      <AppLayout title="">
        <PageCanvasShell
          eyebrow="People"
          title="My Profile"
          description="Your work profile, contact details, and account settings."
          metrics={profileMetrics}
          showCommandBar={false}
        >
          <CanvasPanel title="Profile" icon={IdCard}>
            <SelfProfileView
              profile={meProfile}
              loading={meLoading}
              onSavePhone={async (phone) => {
                toast({ title: "Profile updated" });
                void updateMyProfile
                  .mutateAsync({ data: { phone } })
                  .then(() => {
                    void queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
                  })
                  .catch(() => {
                    toast({ title: "Could not save profile", variant: "destructive" });
                  });
              }}
            />
          </CanvasPanel>
        </PageCanvasShell>
      </AppLayout>
    );
  }

  const employeeSearch = (
    <div className="relative w-full sm:max-w-xs">
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        data-testid="input-search-employees"
        placeholder="Search employees"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="min-h-11 pl-9"
      />
    </div>
  );

  return (
    <AppLayout title="">
      <PageCanvasShell
        eyebrow="People"
        title="Employees"
        description="Directory of team members, roles, and HR profiles."
        metrics={employeeMetrics}
        actions={
          canWrite ? (
            <Button
              data-testid="btn-add-employee"
              size="sm"
              className="hidden min-h-11 gap-2 sm:inline-flex"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={16} /> Add employee
            </Button>
          ) : undefined
        }
      >
        <CanvasPanel title="Employee directory" icon={Users} headerRight={employeeSearch}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 rounded-xl" />
                ))
              : filtered?.map((emp) => (
                  <EmployeeCard
                    key={emp.id}
                    employee={emp}
                    canEdit={canWrite}
                    canDelete={canRemove && emp.id !== user?.id}
                    canResetPassword={canResetPassword && emp.id !== user?.id}
                    canViewSalaries={canViewSalaries}
                    onView={() => setViewing(emp)}
                    onEdit={() => {
                      setEditing(emp);
                      setEditOpen(true);
                    }}
                    onDelete={() => setDeleteTarget(emp)}
                    onResetPassword={() => setResetTarget(emp)}
                  />
                ))}
          </div>
        </CanvasPanel>
      </PageCanvasShell>

      {canWrite && (
        <Button
          data-testid="btn-add-employee-fab"
          size="lg"
          className="fixed bottom-[calc(6.75rem+env(safe-area-inset-bottom))] right-4 z-50 h-14 w-14 rounded-full p-0 shadow-brand-md sm:hidden"
          onClick={() => setCreateOpen(true)}
          aria-label="Add employee"
        >
          <Plus size={22} />
        </Button>
      )}

      <EmployeeFormSheet
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        teams={teams}
        assignableRoles={assignableRoles}
        canViewSalaries={canViewSalaries}
        saving={createEmployee.isPending}
        onCreateSubmit={handleCreate}
        onEditSubmit={handleEdit}
      />

      <EmployeeFormSheet
        mode="edit"
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditing(null);
        }}
        employee={editing}
        teams={teams}
        assignableRoles={assignableRoles}
        canViewSalaries={canViewSalaries}
        saving={updateEmployee.isPending}
        onCreateSubmit={handleCreate}
        onEditSubmit={handleEdit}
      />

      <EmployeeDetailDialog
        employee={viewing}
        canEdit={canWrite}
        canViewSalaries={canViewSalaries}
        onClose={() => setViewing(null)}
        onEdit={(employee) => {
          setViewing(null);
          setEditing(employee);
          setEditOpen(true);
        }}
      />

      <EmployeePasswordResetSheet
        employee={resetTarget}
        open={resetTarget !== null}
        onOpenChange={(open) => !open && setResetTarget(null)}
        saving={resetPassword.isPending}
        onSubmit={handlePasswordReset}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete employee?"
        description={
          deleteTarget ? (
            <div className="space-y-3 text-sm">
              <p>
                This offboards <strong>{deleteTarget.fullName}</strong> and removes their login,
                profile photo, contact details, payroll profile, and HR profile from active records.
              </p>
              <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-left">
                <p className="font-medium text-foreground">Old data handling</p>
                <p className="mt-1 text-muted-foreground">
                  A limited deletion audit snapshot is retained for compliance: employee id, name,
                  email, role, team id, status, employee code, creation date, and deletion date.
                  Uploaded documents, photos, password hashes, address, salary profile, and personal
                  identity fields are not retained in the active profile.
                </p>
              </div>
            </div>
          ) : undefined
        }
        confirmLabel="Offboard and delete"
        variant="destructive"
        loading={deleteEmployee.isPending}
        onConfirm={confirmDelete}
      />
    </AppLayout>
  );
}

function formatResidentialAddress(employee: Employee) {
  return [
    employee.address,
    employee.addressLine2,
    employee.city,
    employee.state,
    employee.zipCode,
    employee.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatOptionLabel(value: string | null | undefined) {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getDocumentName(value?: string | null) {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value) as { name?: string };
    return parsed.name ?? "";
  } catch {
    return "";
  }
}

function DetailSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Briefcase;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/70 bg-card/70 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Icon size={16} className="text-primary" />
        {title}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 break-words text-sm text-foreground">{value}</div>
    </div>
  );
}

function EmployeeDetailDialog({
  employee,
  canEdit,
  canViewSalaries,
  onClose,
  onEdit,
}: {
  employee: Employee | null;
  canEdit: boolean;
  canViewSalaries: boolean;
  onClose: () => void;
  onEdit: (employee: Employee) => void;
}) {
  if (!employee) return null;
  const residentialAddress = formatResidentialAddress(employee);
  const aadhaarDocumentName = getDocumentName(employee.aadhaarDocument);
  const identity = parseEmployeeIdentityImages(employee.avatarUrl);

  return (
    <Dialog open={employee !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col gap-4 pr-8 sm:flex-row sm:items-start">
            <div className="relative mx-auto aspect-square w-32 shrink-0 overflow-hidden rounded-2xl border border-border/80 bg-muted shadow-brand-sm sm:mx-0">
              {identity.profilePhotoUrl ? (
                <EmployeeProfilePhoto
                  src={identity.profilePhotoUrl}
                  alt={`${employee.fullName} profile`}
                  rounded="2xl"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs font-medium text-muted-foreground">
                  Profile photo pending
                </div>
              )}
              <div className="absolute bottom-2 right-2 rounded-full border border-background bg-background p-1 shadow-brand-sm">
                <UserAvatar
                  avatarUrl={employee.avatarUrl}
                  fullName={employee.fullName}
                  className="h-9 w-9 shrink-0"
                  fallbackClassName="bg-primary/15 text-primary font-semibold"
                  iconSize={18}
                />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-xl">{employee.fullName}</DialogTitle>
              <DialogDescription>
                {employee.jobTitle ?? "Employee"} • {employee.teamName ?? "No team"}
              </DialogDescription>
              <p className="mt-2 text-xs text-muted-foreground">
                Framed photo is the employee profile image. The small badge is their app avatar.
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn("shrink-0 text-[10px]", statusColor(employee.status ?? "active"))}
            >
              {employee.status ?? "active"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <DetailSection title="Work profile" icon={Briefcase}>
            <DetailItem label="Employee ID" value={formatValue(employee.employeeCode)} />
            <DetailItem label="Role" value={formatOptionLabel(employee.role)} />
            <DetailItem label="Team" value={formatValue(employee.teamName)} />
            <DetailItem label="Job title" value={formatValue(employee.jobTitle)} />
            <DetailItem label="Joining date" value={formatDate(employee.startDate)} />
            {canViewSalaries && (
              <DetailItem
                label="Salary"
                value={employee.baseSalary != null ? formatCurrency(employee.baseSalary) : "—"}
              />
            )}
          </DetailSection>

          <DetailSection title="Contact" icon={Mail}>
            <DetailItem label="Email" value={formatValue(employee.email)} />
            <DetailItem label="Phone" value={formatValue(employee.phone)} />
            <DetailItem label="Residential address" value={formatValue(residentialAddress)} />
          </DetailSection>

          <DetailSection title="Personal identity" icon={IdCard}>
            <DetailItem label="Date of birth" value={formatDate(employee.dob)} />
            <DetailItem label="Gender" value={formatOptionLabel(employee.gender)} />
            <DetailItem label="Marital status" value={formatOptionLabel(employee.maritalStatus)} />
            <DetailItem label="Nationality" value={formatValue(employee.nationality)} />
            <DetailItem label="Aadhaar number" value={formatValue(employee.aadhaarNumber)} />
            <DetailItem label="Blood group" value={formatValue(employee.bloodGroup)} />
            <DetailItem label="Highest qualification" value={formatValue(employee.highestQualification)} />
          </DetailSection>

          <DetailSection title="Emergency and documents" icon={ShieldCheck}>
            <DetailItem label="Emergency contact" value={formatValue(employee.emergencyContactName)} />
            <DetailItem label="Emergency phone" value={formatValue(employee.emergencyContactPhone)} />
            <DetailItem label="Aadhaar copy" value={aadhaarDocumentName || "—"} />
            <DetailItem label="Notes" value={formatValue(employee.notes)} />
          </DetailSection>

          <section className="rounded-xl border border-border/70 bg-card/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <IdCard size={16} className="text-primary" />
              Digital ID card
            </div>
            <IdCardPreview employeeId={employee.id} canEmail={canEdit} />
            <div className="mt-4">
              <CertificateList
                userId={employee.id}
                verifySlug={(employee as { verifySlug?: string }).verifySlug}
              />
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 -mx-6 -mb-6 mt-2 flex justify-end gap-2 border-t border-border bg-background/95 px-6 py-4 backdrop-blur">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          {canEdit && (
            <Button type="button" onClick={() => onEdit(employee)}>
              Edit details
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SelfProfileView({
  profile,
  loading,
  onSavePhone,
}: {
  profile: Employee | undefined;
  loading: boolean;
  onSavePhone: (phone: string) => Promise<void>;
}) {
  const [phone, setPhone] = useState("");

  useEffect(() => {
    setPhone(profile?.phone ?? "");
  }, [profile?.phone]);

  if (loading) return <Skeleton className="h-48 w-full max-w-lg" />;
  if (!profile) return null;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="space-y-4">
          <div className="flex items-center gap-4">
            <UserAvatar
              avatarUrl={profile.avatarUrl}
              fullName={profile.fullName}
              className="h-14 w-14"
              fallbackClassName="bg-primary/15 text-primary"
            />
            <div>
              <p className="text-lg font-semibold">{profile.fullName}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <p className="text-sm capitalize text-muted-foreground">
                {profile.role?.replace(/_/g, " ") ?? ""}
              </p>
            </div>
          </div>
          <p className="text-sm">
            {profile.jobTitle ?? ""}  {profile.teamName ?? "No team"}
          </p>
          {(profile.baseSalary != null || profile.bonus != null) && (
            <div className="border-t pt-3 text-sm">
              <p>Base: {formatCurrency(profile.baseSalary ?? 0)}</p>
              <p>Bonus: {formatCurrency(profile.bonus ?? 0)}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="profile-phone">Phone</Label>
            <Input
              id="profile-phone"
              className="min-h-11"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full"
              onClick={() => void onSavePhone(phone)}
            >
              Save phone
            </Button>
          </div>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Link href="/settings" className="flex-1">
              <Button type="button" variant="outline" className="min-h-11 w-full">
                Account settings
              </Button>
            </Link>
            <Link href="/interns" className="flex-1">
              <Button type="button" variant="outline" className="min-h-11 w-full">
                Intern hub
              </Button>
            </Link>
          </div>
          <div className="border-t border-border/60 pt-4">
            <p className="mb-3 text-sm font-semibold">Your ID card</p>
            <IdCardPreview employeeId={profile.id} />
          </div>
      </div>
    </div>
  );
}
