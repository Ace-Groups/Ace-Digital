import { useEffect, useMemo, useRef, useState } from "react";
import { isRole } from "@workspace/rbac";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Employee } from "@workspace/api-client-react";
import {
  useGetNextEmployeeCode,
  getGetNextEmployeeCodeQueryKey,
  getListTeamsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { TeamCreateDialog } from "@/components/teams/TeamCreateDialog";
import { JobTitleCombobox } from "@/components/employees/JobTitleCombobox";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Separator } from "@/components/ui/separator";

const ROLES = [
  "employee",
  "team_lead",
  "finance",
  "hr",
  "management",
  "client_manager",
  "super_admin",
] as const;

const createSchema = z
  .object({
    fullName: z.string().min(1, "Name required"),
    email: z.string().email("Invalid email"),
    role: z.string(),
    teamId: z.string().optional(),
    jobTitle: z.string().optional(),
    phone: z.string().optional(),
    employeeCode: z.string().optional(),
    startDate: z.string().optional(),
    status: z.string(),
    baseSalary: z.string().optional(),
    bonus: z.string().optional(),
    payrollStatus: z.string().optional(),
    passwordMode: z.enum(["auto", "manual"]),
    password: z.string().optional(),
    sendWelcomeEmail: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.passwordMode === "manual" && (!data.password || data.password.length < 6)) {
      ctx.addIssue({ code: "custom", message: "Min 6 characters", path: ["password"] });
    }
  });

const editSchema = z.object({
  fullName: z.string().min(1, "Name required"),
  email: z.string().email("Invalid email"),
  role: z
    .string()
    .min(1, "Select an access role")
    .refine((r) => isRole(r), { message: "Select an access role" }),
  teamId: z.string().optional(),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  employeeCode: z.string().optional(),
  startDate: z.string().optional(),
  status: z.string(),
  baseSalary: z.string().optional(),
  bonus: z.string().optional(),
  payrollStatus: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

export type EmployeeFormSubmitCreate = {
  fullName: string;
  email: string;
  role: string;
  teamId?: number;
  jobTitle?: string;
  phone?: string;
  employeeCode?: string;
  startDate?: string;
  status?: string;
  baseSalary?: number;
  bonus?: number;
  passwordMode: "auto" | "manual";
  password?: string;
  sendWelcomeEmail: boolean;
};

export type EmployeeFormSubmitEdit = {
  fullName: string;
  email: string;
  role: string;
  teamId?: number;
  jobTitle?: string;
  phone?: string;
  employeeCode?: string;
  startDate?: string;
  status?: string;
  baseSalary?: number;
  bonus?: number;
  payrollStatus?: string;
};

interface EmployeeFormSheetProps {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
  teams?: { id: number; name: string }[];
  assignableRoles: string[];
  canViewSalaries: boolean;
  saving?: boolean;
  onCreateSubmit: (data: EmployeeFormSubmitCreate) => void | Promise<void>;
  onEditSubmit: (data: EmployeeFormSubmitEdit) => void | Promise<void>;
}

export function EmployeeFormSheet({
  mode,
  open,
  onOpenChange,
  employee,
  teams,
  assignableRoles,
  canViewSalaries,
  saving,
  onCreateSubmit,
  onEditSubmit,
}: EmployeeFormSheetProps) {
  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "employee",
      status: "active",
      passwordMode: "auto",
      sendWelcomeEmail: true,
      payrollStatus: "PENDING",
    },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "employee",
      status: "active",
      payrollStatus: "PENDING",
    },
  });

  const passwordMode = createForm.watch("passwordMode");
  const startDateWatch = createForm.watch("startDate");
  const roleOptionsForEdit = useMemo(() => {
    const options = [...assignableRoles];
    if (employee?.role && isRole(employee.role) && !options.includes(employee.role)) {
      options.push(employee.role);
    }
    return options;
  }, [assignableRoles, employee?.role]);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const employeeCodeTouched = useRef(false);
  const queryClient = useQueryClient();

  const nextCodeParams = { startDate: startDateWatch || undefined };
  const { data: nextCode } = useGetNextEmployeeCode(nextCodeParams, {
    query: {
      queryKey: getGetNextEmployeeCodeQueryKey(nextCodeParams),
      enabled: open && mode === "create",
      staleTime: 0,
    },
  });

  useEffect(() => {
    if (!open || mode !== "create") {
      employeeCodeTouched.current = false;
      return;
    }
  }, [open, mode]);

  useEffect(() => {
    if (!open || mode !== "create" || employeeCodeTouched.current) return;
    if (nextCode?.employeeCode) {
      createForm.setValue("employeeCode", nextCode.employeeCode);
    }
  }, [nextCode, open, mode, createForm]);

  useEffect(() => {
    if (!open || mode !== "edit" || !employee) return;
    const normalizedRole =
      employee.role && isRole(employee.role) ? employee.role : "employee";
    editForm.reset({
      fullName: employee.fullName,
      email: employee.email,
      role: normalizedRole,
      teamId: employee.teamId ? String(employee.teamId) : undefined,
      jobTitle: employee.jobTitle ?? "",
      phone: employee.phone ?? "",
      employeeCode: employee.employeeCode ?? "",
      startDate: employee.startDate ? employee.startDate.slice(0, 10) : "",
      status: employee.status ?? "active",
      baseSalary: employee.baseSalary != null ? String(employee.baseSalary) : "",
      bonus: employee.bonus != null ? String(employee.bonus) : "",
      payrollStatus: employee.payrollStatus ?? "PENDING",
    });
  }, [open, mode, employee, editForm]);

  useEffect(() => {
    if (!open || mode !== "create") return;
    createForm.reset({
      fullName: "",
      email: "",
      role: "employee",
      status: "active",
      passwordMode: "auto",
      sendWelcomeEmail: true,
      payrollStatus: "PENDING",
    });
  }, [open, mode, createForm]);

  function mapCommon<
    T extends {
      fullName: string;
      email: string;
      role: string;
      teamId?: string;
      jobTitle?: string;
      phone?: string;
      employeeCode?: string;
      startDate?: string;
      status: string;
      baseSalary?: string;
      bonus?: string;
    },
  >(data: T) {
    return {
      fullName: data.fullName,
      email: data.email,
      role: data.role,
      teamId: data.teamId ? Number(data.teamId) : undefined,
      jobTitle: data.jobTitle || undefined,
      phone: data.phone || undefined,
      employeeCode: data.employeeCode || undefined,
      startDate: data.startDate || undefined,
      status: data.status,
      ...(canViewSalaries && {
        baseSalary: data.baseSalary ? Number(data.baseSalary) : undefined,
        bonus: data.bonus ? Number(data.bonus) : undefined,
      }),
    };
  }

  const title = mode === "create" ? "Add employee" : `Edit ${employee?.fullName ?? "employee"}`;

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title={title}>
      {mode === "create" ? (
        <Form {...createForm}>
          <form
            onSubmit={createForm.handleSubmit((data) => {
              void onCreateSubmit({
                ...mapCommon(data),
                passwordMode: data.passwordMode,
                password: data.passwordMode === "manual" ? data.password : undefined,
                sendWelcomeEmail: data.sendWelcomeEmail,
              });
            })}
            className="mobile-form space-y-5"
          >
            <FormFields
              form={createForm as never}
              teams={teams}
              roles={assignableRoles}
              canViewSalaries={canViewSalaries}
              isCreate
              onEmployeeCodeManualEdit={() => {
                employeeCodeTouched.current = true;
              }}
              onCreateTeamClick={() => setTeamDialogOpen(true)}
            />
            <Separator />
            <p className="text-sm font-medium">Account</p>
            <FormField
              control={createForm.control}
              name="passwordMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="min-h-11">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="auto">Auto-generate and email</SelectItem>
                      <SelectItem value="manual">Set password manually</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            {passwordMode === "manual" && (
              <FormField
                control={createForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temporary password</FormLabel>
                    <FormControl>
                      <Input type="password" className="min-h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <Checkbox
                checked={createForm.watch("sendWelcomeEmail")}
                onCheckedChange={(v) => createForm.setValue("sendWelcomeEmail", v === true)}
              />
              <span className="text-sm">Send welcome email with login details</span>
            </label>
            <Button type="submit" className="h-11 w-full" disabled={saving}>
              {saving ? "Creating…" : "Create employee"}
            </Button>
          </form>
        </Form>
      ) : (
        <Form {...editForm}>
          <form
            onSubmit={editForm.handleSubmit((data) => {
              void onEditSubmit({
                ...mapCommon(data),
                payrollStatus: canViewSalaries ? data.payrollStatus : undefined,
              });
            })}
            className="mobile-form space-y-5"
          >
            <FormFields
              form={editForm as never}
              teams={teams}
              roles={roleOptionsForEdit}
              canViewSalaries={canViewSalaries}
              isEdit
              onCreateTeamClick={() => setTeamDialogOpen(true)}
            />
            <Button type="submit" className="h-11 w-full" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </Form>
      )}
      <TeamCreateDialog
        open={teamDialogOpen}
        onOpenChange={setTeamDialogOpen}
        onCreated={(team) => {
          void queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() });
          if (mode === "create") {
            createForm.setValue("teamId", String(team.id));
          } else {
            editForm.setValue("teamId", String(team.id));
          }
        }}
      />
    </ResponsiveSheet>
  );
}

function FormFields({
  form,
  teams,
  roles,
  canViewSalaries,
  isEdit,
  isCreate,
  onEmployeeCodeManualEdit,
  onCreateTeamClick,
}: {
  form: ReturnType<typeof useForm<CreateForm>>;
  teams?: { id: number; name: string }[];
  roles: string[];
  canViewSalaries: boolean;
  isEdit?: boolean;
  isCreate?: boolean;
  onEmployeeCodeManualEdit?: () => void;
  onCreateTeamClick?: () => void;
}) {
  return (
    <>
      <p className="text-sm font-medium text-muted-foreground">Personal</p>
      <FormField
        control={form.control}
        name="fullName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Full name</FormLabel>
            <FormControl>
              <Input className="min-h-11" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input type="email" className="min-h-11" {...field} />
            </FormControl>
            {isEdit && (
              <p className="text-xs text-muted-foreground">
                Changing email updates the employee&apos;s login address.
              </p>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input className="min-h-11" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="employeeCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Employee ID</FormLabel>
              <FormControl>
                <Input
                  className="min-h-11 font-mono uppercase"
                  {...field}
                  onChange={(e) => {
                    onEmployeeCodeManualEdit?.();
                    field.onChange(e.target.value.toUpperCase());
                  }}
                />
              </FormControl>
              {isCreate && (
                <p className="text-xs text-muted-foreground">
                  Auto-generated — you can edit before save (format 26ACE001).
                </p>
              )}
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="startDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Start date</FormLabel>
            <FormControl>
              <DatePicker
                inModal
                value={field.value}
                onChange={field.onChange}
                placeholder="Select start date"
              />
            </FormControl>
          </FormItem>
        )}
      />
      <Separator />
      <p className="text-sm font-medium text-muted-foreground">Role & team</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Access role</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="min-h-11">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="teamId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger className="min-h-11">
                    <SelectValue placeholder="Team" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {teams?.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {onCreateTeamClick && (
                <Button
                  type="button"
                  variant="link"
                  className="h-auto px-0 text-xs"
                  onClick={onCreateTeamClick}
                >
                  + Create team
                </Button>
              )}
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="jobTitle"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Job title</FormLabel>
            <FormControl>
              <JobTitleCombobox value={field.value ?? ""} onChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
      {canViewSalaries && (
        <>
          <Separator />
          <p className="text-sm font-medium text-muted-foreground">Compensation</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="baseSalary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base salary (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" className="min-h-11" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bonus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bonus (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" className="min-h-11" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          {isEdit && (
            <FormField
              control={form.control}
              name="payrollStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payroll status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="min-h-11">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {["PENDING", "PROCESSED", "PAID"].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          )}
        </>
      )}
    </>
  );
}
