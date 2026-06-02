import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListTeams, useListEmployees } from "@workspace/api-client-react";

const schema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
  teamId: z.string().optional(),
  submittedById: z.string().min(1, "Select who submitted this expense"),
});

export type RecordExpenseFormValues = z.infer<typeof schema>;

interface RecordExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSubmitterId: number;
  showSubmitterPicker: boolean;
  saving?: boolean;
  onSubmit: (values: RecordExpenseFormValues) => Promise<void>;
}

export function RecordExpenseSheet({
  open,
  onOpenChange,
  defaultSubmitterId,
  showSubmitterPicker,
  saving,
  onSubmit,
}: RecordExpenseSheetProps) {
  const { data: teams } = useListTeams();
  const { data: employees } = useListEmployees();

  const form = useForm<RecordExpenseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: "",
      amount: "",
      teamId: "",
      submittedById: String(defaultSubmitterId),
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        description: "",
        amount: "",
        teamId: "",
        submittedById: String(defaultSubmitterId),
      });
    }
  }, [open, defaultSubmitterId, form]);

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Record Expense"
      description="Submit a new business expense. It will be recorded as PENDING."
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mobile-form space-y-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-0"
        >
          {showSubmitterPicker && (
            <FormField
              control={form.control}
              name="submittedById"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Submitted by</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-expense-submitter">
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
          )}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input data-testid="input-expense-desc" placeholder="e.g. AWS Hosting Bill" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (₹)</FormLabel>
                <FormControl>
                  <Input
                    data-testid="input-expense-amount"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="e.g. 45000"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="teamId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
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
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            data-testid="btn-submit-expense"
            type="submit"
            className="h-12 w-full text-base sm:h-10 sm:text-sm"
            disabled={saving}
          >
            Record Expense
          </Button>
        </form>
      </Form>
    </ResponsiveSheet>
  );
}
