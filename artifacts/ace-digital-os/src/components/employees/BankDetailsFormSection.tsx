import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type BankDetailsFormSectionProps<T extends FieldValues> = {
  form: UseFormReturn<T>;
};

export function BankDetailsFormSection<T extends FieldValues>({
  form,
}: BankDetailsFormSectionProps<T>) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <p className="text-sm font-medium text-foreground">Bank & payroll details</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Enter the account number twice to confirm. Used for salary and stipend transfers.
      </p>
      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name={"bankAccountNumber" as Path<T>}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account number</FormLabel>
                <FormControl>
                  <Input
                    className="min-h-11 font-mono"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Enter account number"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={"confirmBankAccountNumber" as Path<T>}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm account number</FormLabel>
                <FormControl>
                  <Input
                    className="min-h-11 font-mono"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Re-enter account number"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name={"bankIfscCode" as Path<T>}
            render={({ field }) => (
              <FormItem>
                <FormLabel>IFSC code</FormLabel>
                <FormControl>
                  <Input
                    className="min-h-11 font-mono uppercase"
                    autoComplete="off"
                    placeholder="e.g. HDFC0001234"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={"bankName" as Path<T>}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bank name</FormLabel>
                <FormControl>
                  <Input className="min-h-11" placeholder="e.g. HDFC Bank" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name={"bankAccountHolderName" as Path<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name as per bank account</FormLabel>
              <FormControl>
                <Input className="min-h-11" placeholder="Exactly as on passbook / cheque" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name={"panNumber" as Path<T>}
            render={({ field }) => (
              <FormItem>
                <FormLabel>PAN number</FormLabel>
                <FormControl>
                  <Input
                    className="min-h-11 font-mono uppercase"
                    placeholder="ABCDE1234F"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={"bankAccountType" as Path<T>}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger className="min-h-11">
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="savings">Savings account</SelectItem>
                    <SelectItem value="current">Current account</SelectItem>
                    <SelectItem value="salary">Salary account</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name={"upiId" as Path<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>UPI ID</FormLabel>
              <FormControl>
                <Input className="min-h-11" placeholder="name@bank" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
