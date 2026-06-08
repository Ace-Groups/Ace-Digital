import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListEmployees, useListProjects } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    allocationType: z.enum(["MONTHLY", "PROJECT"]),
    userId: z.string().min(1, "Select an employee"),
    period: z.string().min(1, "Select a month"),
    baseSalary: z.string().min(1, "Base salary required"),
    bonus: z.string().optional(),
    projectId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.allocationType === "PROJECT" && !data.projectId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select a project", path: ["projectId"] });
    }
    const base = Number(data.baseSalary);
    if (isNaN(base) || base < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid base salary", path: ["baseSalary"] });
    }
    if (data.bonus && (isNaN(Number(data.bonus)) || Number(data.bonus) < 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid bonus", path: ["bonus"] });
    }
  });

export type PostSalaryFormValues = z.infer<typeof schema>;

interface PostSalarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  onSubmit: (values: PostSalaryFormValues) => Promise<void>;
  defaultUserId?: number;
}

export function PostSalarySheet({ open, onOpenChange, saving, onSubmit, defaultUserId }: PostSalarySheetProps) {
  const { data: employees } = useListEmployees();
  const { data: projects } = useListProjects();
  const [mode, setMode] = useState<"MONTHLY" | "PROJECT">("MONTHLY");

  const form = useForm<PostSalaryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      allocationType: "MONTHLY",
      userId: "",
      period: "",
      baseSalary: "",
      bonus: "0",
      projectId: "",
    },
  });

  useEffect(() => {
    if (open) {
      const now = new Date();
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      setMode("MONTHLY");
      form.reset({
        allocationType: "MONTHLY",
        userId: defaultUserId ? String(defaultUserId) : "",
        period,
        baseSalary: "",
        bonus: "0",
        projectId: "",
      });
    }
  }, [open, form, defaultUserId]);

  const selectedUserId = form.watch("userId");
  const selectedEmployee = employees?.find((e) => String(e.id) === selectedUserId);

  useEffect(() => {
    if (selectedEmployee?.salaryMode === "project_based" && mode !== "PROJECT") {
      setMode("PROJECT");
      form.setValue("allocationType", "PROJECT");
    }
  }, [selectedUserId, selectedEmployee, mode, form]);

  function setAllocationType(next: "MONTHLY" | "PROJECT") {
    if (next === "MONTHLY" && selectedEmployee?.salaryMode === "project_based") {
      return;
    }
    setMode(next);
    form.setValue("allocationType", next);
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Post Salary"
      description={
        mode === "MONTHLY"
          ? "Updates the employee’s monthly salary on their profile."
          : "Records a project cost allocation without changing monthly base pay."
      }
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mobile-form space-y-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-0"
        >
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-1">
            {(["MONTHLY", "PROJECT"] as const).map((type) => {
              const isDisabled = type === "MONTHLY" && selectedEmployee?.salaryMode === "project_based";
              return (
                <button
                  key={type}
                  type="button"
                  disabled={isDisabled}
                  data-testid={`salary-mode-${type.toLowerCase()}`}
                  className={cn(
                    "min-h-11 rounded-md text-sm font-medium transition-colors",
                    isDisabled && "opacity-40 cursor-not-allowed",
                    mode === type
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setAllocationType(type)}
                >
                  {type === "MONTHLY" ? "Monthly" : "Project"}
                </button>
              );
            })}
          </div>

          {selectedEmployee?.salaryMode === "project_based" && (
            <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 text-xs text-indigo-600 dark:text-indigo-400">
              <span className="font-semibold">Project-Based Employee:</span> Only project allocations are allowed for {selectedEmployee.fullName}.
            </div>
          )}

          <FormField
            control={form.control}
            name="userId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employee</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-salary-employee">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {employees?.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {mode === "PROJECT" && (
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-salary-project">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects?.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="period"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Period</FormLabel>
                <FormControl>
                  <Input data-testid="input-salary-period" type="month" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="baseSalary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base salary (₹)</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="input-salary-base"
                      type="number"
                      inputMode="decimal"
                      placeholder="e.g. 80000"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
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
                    <Input
                      data-testid="input-salary-bonus"
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button
            data-testid="btn-submit-salary"
            type="submit"
            className="h-12 w-full text-base sm:h-10 sm:text-sm"
            disabled={saving}
          >
            Post Salary
          </Button>
        </form>
      </Form>
    </ResponsiveSheet>
  );
}
