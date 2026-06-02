import { useState, useRef, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateMyProfile } from "@workspace/api-client-react";
import {
  Camera, Upload, Check, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  PRESET_AVATARS,
  encodeAvatarUrl,
  parseAvatarUrl,
  resizeImageFile,
} from "@/lib/avatar";
import { UserAvatar } from "@/components/UserAvatar";

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileDialog({ open, onClose }: ProfileDialogProps) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const updateProfile = useUpdateMyProfile();

  useEffect(() => {
    if (!open) return;
    const parsed = parseAvatarUrl(user?.avatarUrl);
    setAvatarData(parsed.type === "image" ? parsed.value : null);
    setSelectedPreset(parsed.type === "preset" ? parsed.value : null);
    setSaved(false);
  }, [open, user?.avatarUrl]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please choose an image under 5MB.",
        variant: "destructive",
      });
      return;
    }
    try {
      const resized = await resizeImageFile(file);
      setAvatarData(resized);
      setSelectedPreset(null);
    } catch {
      toast({
        title: "Upload failed",
        description: "Could not process that image. Try another file.",
        variant: "destructive",
      });
    }
  }

  function handlePresetSelect(id: string) {
    setSelectedPreset(id);
    setAvatarData(null);
  }

  async function handleSave() {
    const avatarUrl = encodeAvatarUrl(avatarData, selectedPreset);
    try {
      await updateProfile.mutateAsync({ data: { avatarUrl } });
      await refreshUser();
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 800);
    } catch {
      toast({
        title: "Save failed",
        description: "Could not save your profile photo. Please try again.",
        variant: "destructive",
      });
    }
  }

  function handleRemove() {
    setAvatarData(null);
    setSelectedPreset(null);
  }

  const previewUrl = encodeAvatarUrl(avatarData, selectedPreset);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-muted/50 py-4">
            <div className="relative group">
              <UserAvatar
                avatarUrl={previewUrl}
                fullName={user?.fullName}
                className="h-20 w-20 ring-4 ring-[#5483B3]/30"
                fallbackClassName="bg-primary text-white text-2xl"
                iconSize={36}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                <Camera size={20} className="text-white" />
              </button>
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">{user?.fullName}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge variant="secondary" className="mt-1 text-xs capitalize">
                {user?.role?.replace("_", " ")}
              </Badge>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Upload Photo</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 flex-1"
              >
                <Upload size={14} /> Choose Image
              </Button>
              {(avatarData || selectedPreset) && (
                <Button variant="ghost" size="sm" onClick={handleRemove} className="text-red-500 hover:text-red-600">
                  Remove
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG, GIF up to 5MB</p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Or choose an icon</p>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_AVATARS.map((preset) => {
                const Icon = preset.icon;
                const active = selectedPreset === preset.id && !avatarData;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetSelect(preset.id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                      active
                        ? "border-primary bg-primary/10"
                        : "border-transparent bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <div className={`w-9 h-9 rounded-full ${preset.color} flex items-center justify-center`}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <span className="text-xs text-muted-foreground">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Team</p>
              <p className="font-medium text-foreground">{user?.teamName ?? "—"}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Job Title</p>
              <p className="font-medium text-foreground">{user?.jobTitle ?? "—"}</p>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleSave}
              disabled={updateProfile.isPending}
              className="flex-1 gap-2"
            >
              {updateProfile.isPending ? (
                <><Loader2 size={16} className="animate-spin" /> Saving…</>
              ) : saved ? (
                <><Check size={16} /> Saved!</>
              ) : (
                "Save Profile"
              )}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
