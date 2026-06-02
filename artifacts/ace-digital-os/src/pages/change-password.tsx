import { useLocation } from "wouter";
import { useChangePassword } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { setLoginNotice } from "@/lib/login-notice";
import { ChangePasswordShell } from "@/components/account/ChangePasswordShell";
import { PasswordChangeForm } from "@/components/account/PasswordChangeForm";

export default function ChangePasswordPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const changePassword = useChangePassword();

  const mustChange = user?.mustChangePassword ?? false;

  async function handlePasswordSaved({
    currentPassword,
    newPassword,
  }: {
    currentPassword: string;
    newPassword: string;
  }) {
    try {
      await changePassword.mutateAsync({
        data: {
          newPassword,
          ...(mustChange ? {} : { currentPassword }),
        },
      });
      setLoginNotice({ type: "password-updated", email: user?.email });
      await logout();
      setLocation("/login");
    } catch {
      toast({
        title: mustChange ? "Could not set password" : "Current password is incorrect",
        variant: "destructive",
      });
    }
  }

  return (
    <ChangePasswordShell
      title={mustChange ? "Set your password" : "Change password"}
      description={
        mustChange
          ? "Choose a secure password to finish setup. You will sign in again with your new password."
          : "Update your password below. For security, you will be signed out and asked to sign in again."
      }
    >
      <PasswordChangeForm
        showCurrentPassword={!mustChange}
        loading={changePassword.isPending}
        submitLabel={mustChange ? "Save and continue" : "Save password"}
        onValidationError={(message) => toast({ title: message, variant: "destructive" })}
        onSubmit={handlePasswordSaved}
      />
    </ChangePasswordShell>
  );
}
