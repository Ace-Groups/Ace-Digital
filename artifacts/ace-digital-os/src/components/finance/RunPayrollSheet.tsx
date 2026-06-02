import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  period: z.string().min(1, "Select payroll period"),
});

export type RunPayrollFormValues = z.infer<typeof schema>;

interface RunPayrollSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  onSubmit: (values: RunPayrollFormValues) => Promise<void>;
}

export function RunPayrollSheet({ open, onOpenChange, saving, onSubmit }: RunPayrollSheetProps) {
  const form = useForm<RunPayrollFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { period: "" },
  });

  useEffect(() => {
    if (open) {
      const now = new Date();
      form.reset({
        period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      });
    }
  }, [open, form]);

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Run Payroll"
      description="Create a payroll run for the selected month. Totals are calculated from current employee salaries."
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mobile-form space-y-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-0"
        >
          <FormField
            control={form.control}
            name="period"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payroll period</FormLabel>
                <FormControl>
                  <Input data-testid="input-payroll-period" type="month" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            data-testid="btn-submit-payroll-run"
            type="submit"
            className="h-12 w-full text-base sm:h-10 sm:text-sm"
            disabled={saving}
          >
            Run Payroll
          </Button>
        </form>
      </Form>
    </ResponsiveSheet>
  );
}
