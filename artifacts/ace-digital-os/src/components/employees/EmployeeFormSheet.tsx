import { useEffect, useMemo, useRef, useState } from "react";
import { isRole } from "@workspace/rbac";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
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
import { MascotPicker } from "@/components/MascotPicker";
import { defaultMascotForRole } from "@/lib/mascots";
import {
  encodeEmployeeIdentityImages,
  parseEmployeeIdentityImages,
} from "@/lib/avatar";
import { ProfilePhotoUpload } from "@/components/employees/ProfilePhotoUpload";
import { AadhaarMultiUpload } from "@/components/employees/AadhaarMultiUpload";
import { Textarea } from "@/components/ui/textarea";
import { BankDetailsFormSection } from "@/components/employees/BankDetailsFormSection";
import {
  normalizeAadhaarNumber,
  resolveEmergencyRelationship,
  validateHrOnboarding,
} from "@/lib/employee-onboarding";

const ROLES = [
  "employee",
  "team_lead",
  "finance",
  "hr",
  "management",
  "client_manager",
  "super_admin",
] as const;

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

const QUALIFICATION_OPTIONS = [
  "High School",
  "Higher Secondary",
  "Diploma",
  "Bachelor's Degree",
  "Master's Degree",
  "Doctorate",
  "Professional Certification",
  "Other",
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
    salaryMode: z.string().optional(),
    payrollStatus: z.string().optional(),
    passwordMode: z.enum(["auto", "manual"]),
    password: z.string().optional(),
    sendWelcomeEmail: z.boolean(),
    mascotId: z.string().optional(),
    profilePhotoUrl: z.string().optional(),
    dob: z.string().optional(),
    address: z.string().optional(),
    addressLine2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
    gender: z.string().optional(),
    maritalStatus: z.string().optional(),
    nationality: z.string().optional(),
    aadhaarNumber: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactRelationship: z.string().optional(),
    emergencyContactRelationshipOther: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    highestQualification: z.string().optional(),
    bloodGroup: z.string().optional(),
    aadhaarDocument: z.string().optional(),
    workType: z.string().optional(),
    bankAccountNumber: z.string().optional(),
    confirmBankAccountNumber: z.string().optional(),
    bankIfscCode: z.string().optional(),
    bankName: z.string().optional(),
    bankAccountHolderName: z.string().optional(),
    panNumber: z.string().optional(),
    bankAccountType: z.string().optional(),
    upiId: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.passwordMode === "manual" && (!data.password || data.password.length < 6)) {
      ctx.addIssue({ code: "custom", message: "Min 6 characters", path: ["password"] });
    }
    const hrErrors = validateHrOnboarding({ ...data, workType: data.workType ?? "permanent" });
    for (const [field, message] of Object.entries(hrErrors)) {
      ctx.addIssue({
        code: "custom",
        message,
        path: [field as keyof typeof data],
      });
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
  salaryMode: z.string().optional(),
  payrollStatus: z.string().optional(),
  mascotId: z.string().optional(),
  profilePhotoUrl: z.string().optional(),
  dob: z.string().optional(),
  address: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  nationality: z.string().optional(),
  aadhaarNumber: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  emergencyContactRelationshipOther: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  highestQualification: z.string().optional(),
  bloodGroup: z.string().optional(),
  aadhaarDocument: z.string().optional(),
  workType: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  confirmBankAccountNumber: z.string().optional(),
  bankIfscCode: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountHolderName: z.string().optional(),
  panNumber: z.string().optional(),
  bankAccountType: z.string().optional(),
  upiId: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  const hrErrors = validateHrOnboarding({ ...data, workType: data.workType ?? "permanent" }, {
    required: true,
  });
  for (const [field, message] of Object.entries(hrErrors)) {
    ctx.addIssue({
      code: "custom",
      message,
      path: [field as keyof typeof data],
    });
  }
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
  salaryMode?: string;
  passwordMode: "auto" | "manual";
  password?: string;
  sendWelcomeEmail: boolean;
  avatarUrl?: string;
  dob?: string;
  address?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  nationality?: string | null;
  aadhaarNumber?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactPhone?: string | null;
  highestQualification?: string | null;
  bloodGroup?: string | null;
  aadhaarDocument?: string | null;
  workType?: string | null;
  bankAccountNumber?: string | null;
  confirmBankAccountNumber?: string | null;
  bankIfscCode?: string | null;
  bankName?: string | null;
  bankAccountHolderName?: string | null;
  panNumber?: string | null;
  bankAccountType?: string | null;
  upiId?: string | null;
  notes?: string | null;
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
  salaryMode?: string;
  payrollStatus?: string;
  avatarUrl?: string;
  dob?: string;
  address?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  nationality?: string | null;
  aadhaarNumber?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactPhone?: string | null;
  highestQualification?: string | null;
  bloodGroup?: string | null;
  aadhaarDocument?: string | null;
  workType?: string | null;
  bankAccountNumber?: string | null;
  confirmBankAccountNumber?: string | null;
  bankIfscCode?: string | null;
  bankName?: string | null;
  bankAccountHolderName?: string | null;
  panNumber?: string | null;
  bankAccountType?: string | null;
  upiId?: string | null;
  notes?: string | null;
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
  const { toast } = useToast();
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
      salaryMode: "monthly",
      dob: "",
      address: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
      country: "India",
      gender: "",
      maritalStatus: "",
      nationality: "Indian",
      aadhaarNumber: "",
      emergencyContactName: "",
      emergencyContactRelationship: "",
      emergencyContactRelationshipOther: "",
      emergencyContactPhone: "",
      highestQualification: "",
      bloodGroup: "",
      aadhaarDocument: "",
      workType: "permanent",
      bankAccountNumber: "",
      confirmBankAccountNumber: "",
      bankIfscCode: "",
      bankName: "",
      bankAccountHolderName: "",
      panNumber: "",
      bankAccountType: "",
      upiId: "",
      notes: "",
      profilePhotoUrl: "",
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
      salaryMode: "monthly",
      dob: "",
      address: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
      country: "India",
      gender: "",
      maritalStatus: "",
      nationality: "Indian",
      aadhaarNumber: "",
      emergencyContactName: "",
      emergencyContactRelationship: "",
      emergencyContactRelationshipOther: "",
      emergencyContactPhone: "",
      highestQualification: "",
      bloodGroup: "",
      aadhaarDocument: "",
      workType: "permanent",
      bankAccountNumber: "",
      confirmBankAccountNumber: "",
      bankIfscCode: "",
      bankName: "",
      bankAccountHolderName: "",
      panNumber: "",
      bankAccountType: "",
      upiId: "",
      notes: "",
      profilePhotoUrl: "",
    },
  });

  const passwordMode = createForm.watch("passwordMode");
  const startDateWatch = createForm.watch("startDate");
  const createRoleWatch = createForm.watch("role");
  const mascotTouched = useRef(false);
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
    const parsed = parseEmployeeIdentityImages(employee.avatarUrl);
    const mascotId =
      parsed.mascotId ?? defaultMascotForRole(normalizedRole).replace("mascot:", "");
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
      salaryMode: employee.salaryMode ?? "monthly",
      mascotId,
      dob: employee.dob ? employee.dob.slice(0, 10) : "",
      address: employee.address ?? "",
      addressLine2: employee.addressLine2 ?? "",
      city: employee.city ?? "",
      state: employee.state ?? "",
      zipCode: employee.zipCode ?? "",
      country: employee.country ?? "",
      gender: employee.gender ?? "",
      maritalStatus: employee.maritalStatus ?? "",
      nationality: employee.nationality ?? "",
      aadhaarNumber: employee.aadhaarNumber ?? "",
      emergencyContactName: employee.emergencyContactName ?? "",
      emergencyContactRelationship: employee.emergencyContactRelationship?.toLowerCase() ?? "",
      emergencyContactRelationshipOther: "",
      emergencyContactPhone: employee.emergencyContactPhone ?? "",
      highestQualification: employee.highestQualification ?? "",
      bloodGroup: employee.bloodGroup ?? "",
      aadhaarDocument: employee.aadhaarDocument ?? "",
      workType: employee.workType ?? "permanent",
      bankAccountNumber: employee.bankAccountNumber ?? "",
      confirmBankAccountNumber: employee.bankAccountNumber ?? "",
      bankIfscCode: employee.bankIfscCode ?? "",
      bankName: employee.bankName ?? "",
      bankAccountHolderName: employee.bankAccountHolderName ?? "",
      panNumber: employee.panNumber ?? "",
      bankAccountType: employee.bankAccountType ?? "",
      upiId: employee.upiId ?? "",
      notes: employee.notes ?? "",
      profilePhotoUrl: parsed.profilePhotoUrl ?? "",
    });
  }, [open, mode, employee, editForm]);

  useEffect(() => {
    if (!open || mode !== "create") return;
    mascotTouched.current = false;
    createForm.reset({
      fullName: "",
      email: "",
      role: "employee",
      status: "active",
      passwordMode: "auto",
      sendWelcomeEmail: true,
      payrollStatus: "PENDING",
      salaryMode: "monthly",
      mascotId: "7",
      dob: "",
      address: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
      country: "India",
      gender: "",
      maritalStatus: "",
      nationality: "Indian",
      aadhaarNumber: "",
      emergencyContactName: "",
      emergencyContactRelationship: "",
      emergencyContactRelationshipOther: "",
      emergencyContactPhone: "",
      highestQualification: "",
      bloodGroup: "",
      aadhaarDocument: "",
      workType: "permanent",
      bankAccountNumber: "",
      confirmBankAccountNumber: "",
      bankIfscCode: "",
      bankName: "",
      bankAccountHolderName: "",
      panNumber: "",
      bankAccountType: "",
      upiId: "",
      notes: "",
      profilePhotoUrl: "",
    });
  }, [open, mode, createForm]);

  useEffect(() => {
    if (!open || mode !== "create" || mascotTouched.current) return;
    const id = defaultMascotForRole(createRoleWatch).replace("mascot:", "");
    createForm.setValue("mascotId", id);
  }, [createRoleWatch, open, mode, createForm]);

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
      salaryMode?: string;
      dob?: string;
      address?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
      gender?: string;
      maritalStatus?: string;
      nationality?: string;
      aadhaarNumber?: string;
      emergencyContactName?: string;
      emergencyContactRelationship?: string;
      emergencyContactRelationshipOther?: string;
      emergencyContactPhone?: string;
      highestQualification?: string;
      bloodGroup?: string;
      aadhaarDocument?: string;
      workType?: string;
      bankAccountNumber?: string;
      confirmBankAccountNumber?: string;
      bankIfscCode?: string;
      bankName?: string;
      bankAccountHolderName?: string;
      panNumber?: string;
      bankAccountType?: string;
      upiId?: string;
      notes?: string;
      profilePhotoUrl?: string;
    },
  >(data: T) {
    const optional = (value?: string) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    };
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
      dob: data.dob || undefined,
      address: optional(data.address),
      addressLine2: optional(data.addressLine2),
      city: optional(data.city),
      state: optional(data.state),
      zipCode: optional(data.zipCode),
      country: optional(data.country),
      gender: optional(data.gender),
      maritalStatus: optional(data.maritalStatus),
      nationality: optional(data.nationality),
      aadhaarNumber: normalizeAadhaarNumber(data.aadhaarNumber),
      emergencyContactName: optional(data.emergencyContactName),
      emergencyContactRelationship: resolveEmergencyRelationship(data),
      emergencyContactPhone: optional(data.emergencyContactPhone),
      highestQualification: optional(data.highestQualification),
      bloodGroup: optional(data.bloodGroup),
      aadhaarDocument: data.aadhaarDocument || null,
      workType: optional(data.workType) ?? "permanent",
      bankAccountNumber: optional(data.bankAccountNumber),
      confirmBankAccountNumber: optional(data.confirmBankAccountNumber),
      bankIfscCode: optional(data.bankIfscCode)?.toUpperCase() ?? null,
      bankName: optional(data.bankName),
      bankAccountHolderName: optional(data.bankAccountHolderName),
      panNumber: optional(data.panNumber)?.toUpperCase() ?? null,
      bankAccountType: optional(data.bankAccountType)?.toLowerCase() ?? null,
      upiId: optional(data.upiId)?.toLowerCase() ?? null,
      notes: optional(data.notes),
      ...(canViewSalaries && {
        baseSalary: data.baseSalary ? Number(data.baseSalary) : undefined,
        bonus: data.bonus ? Number(data.bonus) : undefined,
        salaryMode: data.salaryMode || "monthly",
      }),
    };
  }

  const title = mode === "create" ? "Add employee" : `Edit ${employee?.fullName ?? "employee"}`;

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title={title} className="sm:max-w-3xl">
      {mode === "create" ? (
        <Form {...createForm}>
          <form
            onSubmit={createForm.handleSubmit(
              (data) => {
                void onCreateSubmit({
                  ...mapCommon(data),
                  passwordMode: data.passwordMode,
                  password: data.passwordMode === "manual" ? data.password : undefined,
                  sendWelcomeEmail: data.sendWelcomeEmail,
                  avatarUrl:
                    encodeEmployeeIdentityImages({
                      profilePhotoUrl: data.profilePhotoUrl || null,
                      mascotId: data.mascotId ?? defaultMascotForRole(data.role).replace("mascot:", ""),
                    }) ?? undefined,
                });
              },
              (errors) => {
                console.error("Form validation errors:", errors);
                const errorList = Object.entries(errors).map(([field, err]) => {
                  const label = field.replace(/([A-Z])/g, " $1").toLowerCase();
                  return `${label}: ${err?.message || "Invalid value"}`;
                });
                toast({
                  title: "Required Fields Missing",
                  description: errorList.slice(0, 3).join(", ") + (errorList.length > 3 ? "..." : ""),
                  variant: "destructive",
                });
              }
            )}
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
            <Separator />
            <IdentityFields
              form={createForm as never}
              onMascotSelect={() => {
                mascotTouched.current = true;
              }}
            />
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
            onSubmit={editForm.handleSubmit(
              (data) => {
                void onEditSubmit({
                  ...mapCommon(data),
                  payrollStatus: canViewSalaries ? data.payrollStatus : undefined,
                  avatarUrl:
                    encodeEmployeeIdentityImages({
                      profilePhotoUrl: data.profilePhotoUrl || null,
                      mascotId: data.mascotId ?? null,
                    }) ?? undefined,
                });
              },
              (errors) => {
                console.error("Form validation errors:", errors);
                const errorList = Object.entries(errors).map(([field, err]) => {
                  const label = field.replace(/([A-Z])/g, " $1").toLowerCase();
                  return `${label}: ${err?.message || "Invalid value"}`;
                });
                toast({
                  title: "Validation Error",
                  description: errorList.slice(0, 3).join(", ") + (errorList.length > 3 ? "..." : ""),
                  variant: "destructive",
                });
              }
            )}
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
            <Separator />
            <IdentityFields form={editForm as never} />
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

function IdentityFields({
  form,
  onMascotSelect,
}: {
  form: ReturnType<typeof useForm<CreateForm>>;
  onMascotSelect?: () => void;
}) {
  const fullName = form.watch("fullName") || "Employee";

  return (
    <section className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Profile identity</p>
        <p className="text-xs text-muted-foreground">
          Professional photo required for ID card and profile. The selected bird remains their app avatar.
        </p>
      </div>
      <FormField
        control={form.control}
        name="profilePhotoUrl"
        render={({ field }) => (
          <FormItem>
            <ProfilePhotoUpload
              value={field.value ?? ""}
              onChange={field.onChange}
              altName={fullName}
            />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="mascotId"
        render={({ field }) => (
          <FormItem>
            <div className="mb-2">
              <FormLabel>Bird avatar</FormLabel>
              <p className="text-xs text-muted-foreground">
                This stays as the small avatar used in navigation, chat, and quick lists.
              </p>
            </div>
            <MascotPicker
              selectedId={field.value ?? null}
              onSelect={(id) => {
                onMascotSelect?.();
                field.onChange(id);
              }}
            />
          </FormItem>
        )}
      />
    </section>
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
            <FormLabel>Full name (as per official documents)</FormLabel>
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
          name="dob"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Birth</FormLabel>
              <FormControl>
                <DatePicker
                  inModal
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select date of birth"
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </div>
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
        <p className="text-sm font-medium text-foreground">Residential address</p>
        <div className="mt-4 space-y-4">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input className="min-h-11" placeholder="House / flat / street" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="addressLine2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address line 2</FormLabel>
                <FormControl>
                  <Input className="min-h-11" placeholder="Area / landmark / apartment" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input className="min-h-11" placeholder="Chennai" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger className="min-h-11">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INDIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zip code</FormLabel>
                  <FormControl>
                    <Input className="min-h-11" inputMode="numeric" placeholder="600001" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input className="min-h-11" list="employee-country-options" placeholder="India" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
      <datalist id="employee-country-options">
        {["India", "United Arab Emirates", "United States", "United Kingdom", "Singapore", "Canada"].map((country) => (
          <option key={country} value={country} />
        ))}
      </datalist>
      <datalist id="employee-nationality-options">
        {["Indian", "Emirati", "American", "British", "Singaporean", "Canadian", "Other"].map((nationality) => (
          <option key={nationality} value={nationality} />
        ))}
      </datalist>
      <datalist id="employee-qualification-options">
        {QUALIFICATION_OPTIONS.map((qualification) => (
          <option key={qualification} value={qualification} />
        ))}
      </datalist>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger className="min-h-11">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="maritalStatus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Marital status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger className="min-h-11">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="nationality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nationality</FormLabel>
              <FormControl>
                <Input
                  className="min-h-11"
                  list="employee-nationality-options"
                  placeholder="Indian"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="aadhaarNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aadhaar number</FormLabel>
              <FormControl>
                <Input
                  className="min-h-11"
                  inputMode="numeric"
                  placeholder="XXXX XXXX XXXX"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="emergencyContactName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Emergency contact name</FormLabel>
              <FormControl>
                <Input className="min-h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="emergencyContactRelationship"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Emergency contact relationship</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger className="min-h-11">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="father">Father</SelectItem>
                  <SelectItem value="mother">Mother</SelectItem>
                  <SelectItem value="brother">Brother</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {form.watch("emergencyContactRelationship") === "other" ? (
        <FormField
          control={form.control}
          name="emergencyContactRelationshipOther"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Specify relationship</FormLabel>
              <FormControl>
                <Input className="min-h-11" placeholder="e.g. Spouse, Guardian" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
      <FormField
        control={form.control}
        name="emergencyContactPhone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Emergency contact phone</FormLabel>
            <FormControl>
              <Input className="min-h-11" inputMode="tel" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="highestQualification"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Highest qualification</FormLabel>
              <FormControl>
                <Input
                  className="min-h-11"
                  list="employee-qualification-options"
                  placeholder="Bachelor's Degree"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bloodGroup"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Blood group</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger className="min-h-11">
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="aadhaarDocument"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Aadhaar card copy</FormLabel>
            <AadhaarMultiUpload value={field.value} onChange={field.onChange} />
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="workType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Work type</FormLabel>
            <Select value={field.value ?? "permanent"} disabled>
              <FormControl>
                <SelectTrigger className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="permanent">Permanent</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" {...field} value="permanent" />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Enter any additional notes..."
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
          </FormItem>
        )}
      />
      <BankDetailsFormSection form={form} />
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
          <div className="mb-4">
            <FormField
              control={form.control}
              name="salaryMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salary Mode</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "monthly"}>
                    <FormControl>
                      <SelectTrigger className="min-h-11">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly Base Salary</SelectItem>
                      <SelectItem value="project_based">Project-Based Payouts</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
          {form.watch("salaryMode") !== "project_based" ? (
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
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 bg-muted/20">
              <p className="text-sm font-medium text-foreground">Project-Based Salary Mode Active</p>
              <p className="text-xs text-muted-foreground mt-1">
                Base salary and bonus are calculated dynamically by aggregating project allocation payouts posted during each payroll month.
              </p>
            </div>
          )}
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
