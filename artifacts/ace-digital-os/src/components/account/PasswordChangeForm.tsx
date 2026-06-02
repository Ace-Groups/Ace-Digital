import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { cn } from "@/lib/utils";

interface PasswordChangeFormProps {
  showCurrentPassword: boolean;
  loading: boolean;
  submitLabel?: string;
  className?: string;
  onSubmit: (values: { currentPassword: string; newPassword: string }) => Promise<void>;
  onValidationError?: (message: string) => void;
}

export function PasswordChangeForm({
  showCurrentPassword,
  loading,
  submitLabel = "Save password",
  className,
  onSubmit,
  onValidationError,
}: PasswordChangeFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (showCurrentPassword && !currentPassword) {
      onValidationError?.("Enter your current password");
      return;
    }
    if (newPassword.length < 8) {
      onValidationError?.("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      onValidationError?.("Passwords do not match");
      return;
    }
    await onSubmit({ currentPassword, newPassword });
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className={cn("mobile-form space-y-4", className)}>
      {showCurrentPassword && (
        <div className="space-y-2">
          <Label htmlFor="current-password">Current password</Label>
          <PasswordInput
            id="current-password"
            enterKeyHint="next"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={loading}
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <PasswordInput
          id="new-password"
          enterKeyHint="next"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">At least 8 characters</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <PasswordInput
          id="confirm-password"
          enterKeyHint="go"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
        />
      </div>
      <Button type="submit" className="mt-1 h-12 w-full text-base font-semibold" disabled={loading}>
        {loading ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
