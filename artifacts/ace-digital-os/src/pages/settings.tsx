import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { CanvasPanel, PageCanvasShell } from "@/components/canvas";
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
import { Bell, Camera, KeyRound, ShieldCheck, Check, X, User, Palette, BadgeCheck } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { PublicCardSettings } from "@/components/credentials/PublicCardSettings";
import {
  enableWebPushNotifications,
  getNotificationPermission,
  isWebPushAvailable,
} from "@/lib/push-notifications";

const NOTIF_PREFS_KEY = "ace-digital-notification-prefs";

interface RoleCapability {
  title: string;
  description: string;
  allowed: string[];
  restricted: string[];
}

const ROLE_CAPABILITIES: Record<string, RoleCapability> = {
  super_admin: {
    title: "Super Admin",
    description: "Full administrative authority over the entire organization.",
    allowed: [
      "Access all system endpoints and configurations",
      "Manage all employee profiles, roles, and credentials",
      "Authorize global payroll runs and approve all expenses",
      "Register new system users and override permission rules"
    ],
    restricted: []
  },
  management: {
    title: "Management",
    description: "High-level oversight of company operations, projects, and finances.",
    allowed: [
      "Create and edit all projects and team directories",
      "Submit and review organizational approvals",
      "Access financial summaries, payroll structures, and client profiles",
      "Update employee details and assign roles up to Team Lead"
    ],
    restricted: [
      "Register raw system users (requires Super Admin)",
      "Delete system audit logs or override system-level config"
    ]
  },
  finance: {
    title: "Finance",
    description: "Financial administration, payroll execution, and expense oversight.",
    allowed: [
      "View global salary directories and run payroll calculations",
      "Approve or reject employee expense submissions",
      "Manage clients and view project lists",
      "Review general financial statements and reports"
    ],
    restricted: [
      "Create or delete projects and tasks",
      "Modify employee career records or personal profiles (except salaries)",
      "Register system users or adjust security parameters"
    ]
  },
  hr: {
    title: "HR (Human Resources)",
    description: "Personnel management, employee directory oversight, and onboarding.",
    allowed: [
      "Create and update employee profiles",
      "Reset user passwords and send onboarding invitation sequences",
      "Review leave requests and submit personnel approvals",
      "Manage global calendar events and team listings"
    ],
    restricted: [
      "View financial summaries or run payroll",
      "View and edit client accounts or projects",
      "Approve or reject commercial expense reports"
    ]
  },
  client_manager: {
    title: "Client Manager",
    description: "External relations, client contract maintenance, and service tickets.",
    allowed: [
      "Add, update, and manage clients and contract values",
      "Assign and resolve customer support service tickets",
      "View associated projects and submit personal leave approvals",
      "Collaborate in active chat channels and create notes"
    ],
    restricted: [
      "Access employee directory salary details",
      "Approve team tasks or global payroll",
      "Reset employee passwords"
    ]
  },
  team_lead: {
    title: "Team Lead",
    description: "Team management, task planning, and project coordination.",
    allowed: [
      "Create, edit, and assign tasks to team members",
      "Write and manage team-scoped projects",
      "Review and approve leave/expense requests for team members",
      "Organize team calendar events and chat channels"
    ],
    restricted: [
      "View salaries outside of self",
      "Delete global company projects",
      "Edit profiles of users outside the assigned team"
    ]
  },
  employee: {
    title: "Employee",
    description: "Standard worker workspace permissions.",
    allowed: [
      "View assigned projects and update task progress",
      "Submit personal approvals (e.g. leave requests) and expense claims",
      "View personal finance payslips and details",
      "Collaborate in active chat channels and calendar events"
    ],
    restricted: [
      "Modify other employees' files or access records",
      "View global finance summaries or payroll operations",
      "Manage company clients or general settings"
    ]
  }
};

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
  const { can } = usePermissions();
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
  const [pushAvailable, setPushAvailable] = useState(false);
  const [pushPermission, setPushPermission] = useState(getNotificationPermission());
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    setFullName(user?.fullName ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.fullName, user?.phone]);

  useEffect(() => {
    void isWebPushAvailable().then(setPushAvailable);
    setPushPermission(getNotificationPermission());
  }, []);

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
    <AppLayout title="">
      <PageCanvasShell
        eyebrow="Workspace"
        title="Settings"
        description="Manage your profile, security, notifications, and appearance."
      >
      <div className="mx-auto max-w-2xl space-y-4">
        <CanvasPanel title="Account" icon={User}>
          <p className="mb-5 text-sm text-muted-foreground">Your name, contact details, and avatar</p>
          <div className="space-y-5">
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
          </div>
        </CanvasPanel>

        {can("verify:edit_public_card") && (
          <CanvasPanel title="Ace Verify · Public card" icon={BadgeCheck}>
            <p className="mb-4 text-sm text-muted-foreground">
              Control what clients see when they scan the QR on your ID card.
            </p>
            <PublicCardSettings />
          </CanvasPanel>
        )}

        {user?.role && ROLE_CAPABILITIES[user.role] && (
          <CanvasPanel title="Role & Privileges" icon={ShieldCheck}>
            <p className="mb-4 text-sm text-muted-foreground">
              Your assigned role is <span className="font-semibold text-foreground">{ROLE_CAPABILITIES[user.role].title}</span>.
              Here is a summary of what you can and cannot do:
            </p>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground italic">
                "{ROLE_CAPABILITIES[user.role].description}"
              </p>
              
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Allowed Operations</h4>
                <ul className="space-y-2">
                  {ROLE_CAPABILITIES[user.role].allowed.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {ROLE_CAPABILITIES[user.role].restricted.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-sm font-semibold text-foreground">Restricted Boundaries</h4>
                  <ul className="space-y-2">
                    {ROLE_CAPABILITIES[user.role].restricted.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <X className="mt-0.5 size-4 shrink-0 text-rose-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CanvasPanel>
        )}

        <CanvasPanel title="Password" icon={KeyRound}>
          <p className="mb-4 text-sm text-muted-foreground">
            After updating, you will be signed out and asked to sign in with your new password.
          </p>
            <PasswordChangeForm
              showCurrentPassword
              loading={changePassword.isPending}
              submitLabel="Update password"
              onValidationError={(message) => toast({ title: message, variant: "destructive" })}
              onSubmit={handleChangePassword}
            />
        </CanvasPanel>

        <CanvasPanel title="Notifications" icon={Bell}>
          <p className="mb-4 text-sm text-muted-foreground">
            Push and email preferences for this device
          </p>
          <div className="space-y-4">
            {pushAvailable && (
              <>
                <div className="flex min-h-11 items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Bell className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <div>
                      <p className="text-sm font-medium">Push notifications</p>
                      <p className="text-xs text-muted-foreground">
                        {pushPermission === "granted"
                          ? "Enabled — chat, approvals, tasks, salary, and assignments"
                          : pushPermission === "denied"
                            ? "Blocked in browser settings"
                            : "Get alerts on this device"}
                      </p>
                    </div>
                  </div>
                  {pushPermission === "granted" ? (
                    <span className="text-xs font-medium text-emerald-600">On</span>
                  ) : pushPermission === "denied" ? (
                    <span className="text-xs text-muted-foreground">Blocked</span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      className="min-h-9"
                      disabled={pushBusy}
                      onClick={() => {
                        setPushBusy(true);
                        void enableWebPushNotifications()
                          .then((result) => {
                            setPushPermission(getNotificationPermission());
                            if (result.ok) {
                              toast({ title: "Push notifications enabled" });
                            } else if (result.reason === "denied") {
                              toast({
                                title: "Notifications blocked",
                                description: "Allow notifications in your browser settings.",
                                variant: "destructive",
                              });
                            } else {
                              toast({
                                title: "Could not enable push",
                                variant: "destructive",
                              });
                            }
                          })
                          .finally(() => setPushBusy(false));
                      }}
                    >
                      {pushBusy ? "Enabling…" : "Enable"}
                    </Button>
                  )}
                </div>
                <Separator />
              </>
            )}
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
          </div>
        </CanvasPanel>

        <CanvasPanel title="Appearance" icon={Palette}>
          <p className="mb-4 text-sm text-muted-foreground">Theme for Ace-Digital on this device</p>
          <div className="flex min-h-11 items-center justify-between gap-4">
            <p className="text-sm capitalize text-muted-foreground">
              Current: {resolvedTheme === "dark" ? "Dark" : "Light"}
            </p>
            <ThemeToggle className="h-11 w-11" />
          </div>
        </CanvasPanel>
      </div>
      </PageCanvasShell>

      <ProfileDialog open={avatarOpen} onClose={() => setAvatarOpen(false)} />
    </AppLayout>
  );
}
