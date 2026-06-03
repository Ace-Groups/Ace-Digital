import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useChangePassword,
  useUpdateMyProfile,
  getGetMyProfileQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { setLoginNotice } from "@/lib/login-notice";
import { PasswordChangeForm } from "@/components/account/PasswordChangeForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserAvatar } from "@/components/UserAvatar";
import { ProfileDialog } from "@/components/ProfileDialog";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { Camera, KeyRound } from "lucide-react";

const NOTIF_PREFS_KEY = "ace-digital-notification-prefs";

type NotificationPrefs = {
  emailTasks: boolean;
  emailApprovals: boolean;
};

function loadNotifPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(NOTIF_PREFS_KEY);
    if (raw) return JSON.parse(raw) as NotificationPrefs;
  } catch {
    /* ignore */
  }
  return { emailTasks: true, emailApprovals: true };
}

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateProfile = useUpdateMyProfile();
  const changePassword = useChangePassword();
  const { resolvedTheme } = useTheme();

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(loadNotifPrefs);

  useEffect(() => {
    setFullName(user?.fullName ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.fullName, user?.phone]);

  function saveNotifPrefs(next: NotificationPrefs) {
    setNotifPrefs(next);
    localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(next));
    toast({ title: "Preferences saved" });
  }

  async function handleSaveProfile() {
    const savedName = fullName.trim();
    const savedPhone = phone.trim() || undefined;
    toast({ title: "Profile updated" });
    void updateProfile
      .mutateAsync({
        data: { fullName: savedName, phone: savedPhone },
      })
      .then(async () => {
        await refreshUser();
        await queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
      })
      .catch(() => {
        toast({ title: "Could not save profile", variant: "destructive" });
      });
  }

  async function handleChangePassword({
    currentPassword,
    newPassword,
  }: {
    currentPassword: string;
    newPassword: string;
  }) {
    try {
      await changePassword.mutateAsync({
        data: { currentPassword, newPassword },
      });
      setLoginNotice({ type: "password-updated", email: user?.email });
      await logout();
      setLocation("/login");
    } catch {
      toast({ title: "Current password is incorrect", variant: "destructive" });
    }
  }

  return (
    <AppLayout title="Settings">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your name, contact details, and avatar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <UserAvatar
                avatarUrl={user?.avatarUrl}
                fullName={user?.fullName}
                className="h-16 w-16"
                fallbackClassName="bg-primary/15 text-primary text-lg"
              />
              <Button
                type="button"
                variant="outline"
                className="min-h-11 gap-2"
                onClick={() => setAvatarOpen(true)}
              >
                <Camera size={16} />
                Change photo
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-name">Full name</Label>
              <Input
                id="settings-name"
                className="min-h-11"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-email">Email</Label>
              <Input id="settings-email" className="min-h-11" value={user?.email ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-phone">Phone</Label>
              <Input
                id="settings-phone"
                className="min-h-11"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Button
              type="button"
              className="min-h-11 w-full sm:w-auto"
              disabled={updateProfile.isPending}
              onClick={() => void handleSaveProfile()}
            >
              {updateProfile.isPending ? "Saving…" : "Save profile"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg border border-border/80 bg-primary/10">
              <KeyRound className="size-4 text-primary" aria-hidden />
            </div>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              After updating, you will be signed out and asked to sign in with your new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordChangeForm
              showCurrentPassword
              loading={changePassword.isPending}
              submitLabel="Update password"
              onValidationError={(message) => toast({ title: message, variant: "destructive" })}
              onSubmit={handleChangePassword}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Email preferences (stored on this device until server sync is added)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex min-h-11 items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Task assignments</p>
                <p className="text-xs text-muted-foreground">Email when you are assigned a task</p>
              </div>
              <Switch
                checked={notifPrefs.emailTasks}
                onCheckedChange={(v) =>
                  saveNotifPrefs({ ...notifPrefs, emailTasks: v })
                }
              />
            </div>
            <Separator />
            <div className="flex min-h-11 items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Approvals</p>
                <p className="text-xs text-muted-foreground">Email for approval updates</p>
              </div>
              <Switch
                checked={notifPrefs.emailApprovals}
                onCheckedChange={(v) =>
                  saveNotifPrefs({ ...notifPrefs, emailApprovals: v })
                }
              />
            </div>
            <Link href="/notifications" className="block pt-2">
              <Button type="button" variant="outline" className="min-h-11 w-full">
                View in-app notifications
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Theme for Ace-Digital on this device</CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-11 items-center justify-between gap-4">
            <p className="text-sm capitalize text-muted-foreground">
              Current: {resolvedTheme === "dark" ? "Dark" : "Light"}
            </p>
            <ThemeToggle className="h-11 w-11" />
          </CardContent>
        </Card>
      </div>

      <ProfileDialog open={avatarOpen} onClose={() => setAvatarOpen(false)} />
    </AppLayout>
  );
}
