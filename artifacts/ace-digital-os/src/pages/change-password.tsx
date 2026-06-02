import { useState } from "react";
import { useLocation } from "wouter";
import { useChangePassword } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import aceLogo from "@/assets/ace-logo.png";

export default function ChangePasswordPage() {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const mustChange = user?.mustChangePassword ?? false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    try {
      await changePassword.mutateAsync({
        data: {
          newPassword,
          ...(mustChange ? {} : { currentPassword }),
        },
      });
      await refreshUser();
      toast({ title: "Password updated" });
      setLocation("/");
    } catch {
      toast({
        title: mustChange ? "Could not set password" : "Current password is incorrect",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-8">
      <img src={aceLogo} alt="" className="mb-6 h-12 w-12 object-contain" />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{mustChange ? "Set your password" : "Change password"}</CardTitle>
          <CardDescription>
            {mustChange
              ? "For security, choose a new password before continuing."
              : "Update your account password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="mobile-form space-y-4">
            {!mustChange && (
              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  enterKeyHint="next"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="min-h-11"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                enterKeyHint="next"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                enterKeyHint="go"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="min-h-11"
              />
            </div>
            <Button
              type="submit"
              className="h-11 w-full"
              disabled={changePassword.isPending}
            >
              {changePassword.isPending ? "Saving…" : "Save password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
