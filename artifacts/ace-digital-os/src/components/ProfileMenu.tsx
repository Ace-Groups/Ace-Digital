import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateMyProfile } from "@workspace/api-client-react";
import {
  Camera, Upload, Check, Loader2, Settings, UserCircle, LogOut,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  encodeAvatarUrl,
  parseAvatarUrl,
  resizeImageFile,
} from "@/lib/avatar";
import { defaultMascotForRole } from "@/lib/mascots";
import { UserAvatar } from "@/components/UserAvatar";
import { MascotPicker } from "@/components/MascotPicker";
import { usePermissions } from "@/hooks/use-permissions";
import { FilePickControl } from "@/components/ui/file-pick-control";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProfileMenuProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileMenu({ open, onClose }: ProfileMenuProps) {
  const { user, refreshUser, logout } = useAuth();
  const { can } = usePermissions();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [selectedMascot, setSelectedMascot] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const updateProfile = useUpdateMyProfile();

  useEffect(() => {
    if (!open) return;
    const parsed = parseAvatarUrl(user?.avatarUrl);
    setAvatarData(parsed.type === "image" ? parsed.value : null);
    setSelectedMascot(parsed.type === "mascot" ? parsed.value : null);
    setSaved(false);
    setShowAvatarEditor(false);
  }, [open, user?.avatarUrl]);

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Choose an image under 5MB.", variant: "destructive" });
      return;
    }
    try {
      const resized = await resizeImageFile(file);
      setAvatarData(resized);
      setSelectedMascot(null);
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  }

  async function handleSaveAvatar() {
    const avatarUrl = encodeAvatarUrl(avatarData, selectedMascot, "mascot");
    try {
      await updateProfile.mutateAsync({ data: { avatarUrl } });
      await refreshUser();
      setSaved(true);
      setTimeout(() => { setSaved(false); setShowAvatarEditor(false); }, 800);
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  }

  async function handleSignOut() {
    onClose();
    await logout();
    setLocation("/login");
  }

  const previewUrl = avatarData
    ? avatarData
    : selectedMascot
      ? encodeAvatarUrl(null, selectedMascot, "mascot")
      : user?.avatarUrl ?? defaultMascotForRole(user?.role ?? "employee");

  const showMyProfile = can("employees:read_self") || can("employees:read");

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title="Profile"
      className="sm:max-w-md"
    >
      <div className="space-y-4 pb-2">
        <div className="flex flex-col items-center gap-3 rounded-xl bg-muted/50 py-4">
          <button
            type="button"
            onClick={() => setShowAvatarEditor((v) => !v)}
            className="relative group"
          >
            <UserAvatar
              avatarUrl={previewUrl}
              fullName={user?.fullName}
              className="h-20 w-20 ring-4 ring-primary/20"
              fallbackClassName="bg-primary text-white text-2xl"
              iconSize={36}
            />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera size={20} className="text-white" />
            </span>
          </button>
          <div className="text-center">
            <p className="font-semibold">{user?.fullName}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <Badge variant="secondary" className="mt-1 text-xs capitalize">
              {user?.role?.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>

        {showAvatarEditor && (
          <div className="space-y-4 rounded-lg border border-border p-4">
            <p className="text-sm font-medium">Change avatar</p>
            <div className="flex gap-2">
              <FilePickControl
                accept="image/*"
                onFile={(file) => void handleFile(file)}
                aria-label="Upload profile photo"
                className="flex-1"
              >
                <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full gap-2")}>
                  <Upload size={14} /> Upload photo
                </span>
              </FilePickControl>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAvatarData(null);
                  setSelectedMascot(ROLE_DEFAULT_FROM_USER(user?.role));
                }}
              >
                Reset
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Or pick a mascot</p>
            <MascotPicker
              selectedId={selectedMascot}
              onSelect={(id) => { setSelectedMascot(id); setAvatarData(null); }}
            />
            <Button onClick={handleSaveAvatar} disabled={updateProfile.isPending} className="w-full gap-2">
              {updateProfile.isPending ? (
                <><Loader2 size={16} className="animate-spin" /> Saving…</>
              ) : saved ? (
                <><Check size={16} /> Saved!</>
              ) : (
                "Save avatar"
              )}
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Team</p>
            <p className="font-medium">{user?.teamName ?? "—"}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Job title</p>
            <p className="font-medium">{user?.jobTitle ?? "—"}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Link href="/settings">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={onClose}>
              <Settings size={16} /> Settings
            </Button>
          </Link>
          {showMyProfile && (
            <Link href="/employees">
              <Button variant="outline" className="w-full justify-start gap-2" onClick={onClose}>
                <UserCircle size={16} /> My profile
              </Button>
            </Link>
          )}
          <Button
            variant="destructive"
            className="w-full justify-start gap-2"
            data-testid="btn-profile-logout"
            onClick={handleSignOut}
          >
            <LogOut size={16} /> Sign out
          </Button>
        </div>
      </div>
    </ResponsiveSheet>
  );
}

function ROLE_DEFAULT_FROM_USER(role?: string): string {
  const m = defaultMascotForRole(role ?? "employee");
  return m.replace("mascot:", "");
}
