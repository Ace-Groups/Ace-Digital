import { useState } from "react";
import type { Employee } from "@workspace/api-client-react";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type PasswordResetSubmit = {
  mode: "email" | "manual";
  password?: string;
  sendWelcomeEmail?: boolean;
};

interface EmployeePasswordResetSheetProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  onSubmit: (data: PasswordResetSubmit) => void | Promise<void>;
}

export function EmployeePasswordResetSheet({
  employee,
  open,
  onOpenChange,
  saving,
  onSubmit,
}: EmployeePasswordResetSheetProps) {
  const [mode, setMode] = useState<"email" | "manual">("email");
  const [password, setPassword] = useState("");
  const [sendEmailOnManual, setSendEmailOnManual] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setMode("email");
      setPassword("");
      setSendEmailOnManual(false);
    }
    onOpenChange(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "manual" && password.length < 8) return;
    void onSubmit({
      mode,
      ...(mode === "manual" && { password }),
      ...(mode === "email"
        ? { sendWelcomeEmail: true }
        : { sendWelcomeEmail: sendEmailOnManual }),
    });
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={employee ? `Reset password — ${employee.fullName}` : "Reset password"}
    >
      <form onSubmit={handleSubmit} className="mobile-form space-y-5">
        <p className="text-sm text-muted-foreground">
          For forgotten passwords. The employee must set a new password on next login.
        </p>

        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as "email" | "manual")}
          className="space-y-3"
        >
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
            <RadioGroupItem value="email" className="mt-1" />
            <div>
              <p className="text-sm font-medium">Send reset email</p>
              <p className="text-xs text-muted-foreground">
                Generates a temporary password and emails it via Firebase (forgot-password flow).
              </p>
            </div>
          </label>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
            <RadioGroupItem value="manual" className="mt-1" />
            <div className="flex-1">
              <p className="text-sm font-medium">Set password manually</p>
              <p className="text-xs text-muted-foreground">
                Choose a temporary password yourself (share securely with the employee).
              </p>
            </div>
          </label>
        </RadioGroup>

        {mode === "manual" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="reset-password">New temporary password</Label>
              <Input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                className="min-h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
              <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <Checkbox
                checked={sendEmailOnManual}
                onCheckedChange={(v) => setSendEmailOnManual(v === true)}
              />
              <span className="text-sm">Also email credentials to the employee</span>
            </label>
          </>
        )}

        <Button
          type="submit"
          className="h-11 w-full"
          disabled={saving || (mode === "manual" && password.length < 8)}
        >
          {saving
            ? "Saving…"
            : mode === "email"
              ? "Send reset email"
              : "Set password"}
        </Button>
      </form>
    </ResponsiveSheet>
  );
}
