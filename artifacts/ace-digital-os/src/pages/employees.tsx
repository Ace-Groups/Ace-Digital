import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/UserAvatar";
import { Plus, Search } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
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
              passwordMode: data.passwordMode,
              password: data.password,
              sendWelcomeEmail: data.sendWelcomeEmail,
              avatarUrl: data.avatarUrl,
              dob: data.dob,
              address: data.address,
              notes: data.notes,
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
      payrollStatus: data.payrollStatus,
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      dob: data.dob,
      address: data.address,
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
      toast({ title: "Employee removed" });
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
      <AppLayout title="My Profile">
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
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Employees">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
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
        {canWrite && (
          <Button
            data-testid="btn-add-employee"
            className="hidden min-h-11 gap-2 sm:inline-flex"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={16} /> Add employee
          </Button>
        )}
      </div>

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
                onEdit={() => {
                  setEditing(emp);
                  setEditOpen(true);
                }}
                onDelete={() => setDeleteTarget(emp)}
                onResetPassword={() => setResetTarget(emp)}
              />
            ))}
      </div>

      {canWrite && (
        <Button
          data-testid="btn-add-employee-fab"
          size="lg"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 h-14 w-14 rounded-full p-0 shadow-brand-md sm:hidden"
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
            <>
              This permanently removes <strong>{deleteTarget.fullName}</strong>. This cannot be
              undone.
            </>
          ) : undefined
        }
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteEmployee.isPending}
        onConfirm={confirmDelete}
      />
    </AppLayout>
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
      <Card>
        <CardContent className="space-y-4 p-6">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
