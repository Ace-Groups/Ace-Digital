import { useState, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { getInitials } from "@/lib/utils";
import {
  Camera, User, Code2, Palette, TrendingUp, DollarSign,
  Settings, Users, Smile, Upload, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const PRESET_AVATARS = [
  { id: "user", icon: User, label: "Default", color: "bg-slate-500" },
  { id: "code", icon: Code2, label: "Engineer", color: "bg-blue-600" },
  { id: "design", icon: Palette, label: "Designer", color: "bg-purple-600" },
  { id: "sales", icon: TrendingUp, label: "Sales", color: "bg-amber-600" },
  { id: "finance", icon: DollarSign, label: "Finance", color: "bg-emerald-600" },
  { id: "hr", icon: Users, label: "HR", color: "bg-pink-600" },
  { id: "ops", icon: Settings, label: "Ops", color: "bg-orange-600" },
  { id: "mgmt", icon: Smile, label: "Mgmt", color: "bg-primary" },
];

const AVATAR_KEY = "ace_avatar";
const PRESET_KEY = "ace_avatar_preset";

export function getStoredAvatar(): { type: "image" | "preset" | null; value: string | null } {
  const image = localStorage.getItem(AVATAR_KEY);
  if (image) return { type: "image", value: image };
  const preset = localStorage.getItem(PRESET_KEY);
  if (preset) return { type: "preset", value: preset };
  return { type: null, value: null };
}

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileDialog({ open, onClose }: ProfileDialogProps) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarData, setAvatarData] = useState<string | null>(localStorage.getItem(AVATAR_KEY));
  const [selectedPreset, setSelectedPreset] = useState<string | null>(localStorage.getItem(PRESET_KEY));
  const [saved, setSaved] = useState(false);

  const initials = getInitials(user?.fullName ?? "?");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
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
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setAvatarData(result);
      setSelectedPreset(null);
    };
    reader.readAsDataURL(file);
  }

  function handlePresetSelect(id: string) {
    setSelectedPreset(id);
    setAvatarData(null);
  }

  function handleSave() {
    if (avatarData) {
      localStorage.setItem(AVATAR_KEY, avatarData);
      localStorage.removeItem(PRESET_KEY);
    } else if (selectedPreset) {
      localStorage.setItem(PRESET_KEY, selectedPreset);
      localStorage.removeItem(AVATAR_KEY);
    } else {
      localStorage.removeItem(AVATAR_KEY);
      localStorage.removeItem(PRESET_KEY);
    }
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  }

  function handleRemove() {
    setAvatarData(null);
    setSelectedPreset(null);
    localStorage.removeItem(AVATAR_KEY);
    localStorage.removeItem(PRESET_KEY);
  }

  const presetInfo = PRESET_AVATARS.find((p) => p.id === selectedPreset);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Current avatar preview */}
          <div className="flex flex-col items-center gap-3 rounded-xl bg-muted/50 py-4">
            <div className="relative group">
              {avatarData ? (
                <Avatar className="h-20 w-20 ring-4 ring-[#5483B3]/30">
                  <AvatarImage src={avatarData} alt={user?.fullName} className="object-cover" />
                  <AvatarFallback className="bg-primary text-white text-2xl">{initials}</AvatarFallback>
                </Avatar>
              ) : selectedPreset && presetInfo ? (
                <div className={`h-20 w-20 rounded-full ${presetInfo.color} flex items-center justify-center ring-4 ring-[#5483B3]/30`}>
                  <presetInfo.icon size={36} className="text-white" />
                </div>
              ) : (
                <Avatar className="h-20 w-20 ring-4 ring-[#5483B3]/30">
                  <AvatarFallback className="bg-primary text-white text-2xl">{initials}</AvatarFallback>
                </Avatar>
              )}
              <button
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

          {/* Upload section */}
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

          {/* Preset icons */}
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Or choose an icon</p>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_AVATARS.map((preset) => {
                const Icon = preset.icon;
                const active = selectedPreset === preset.id && !avatarData;
                return (
                  <button
                    key={preset.id}
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

          {/* Info row */}
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

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleSave}
              className="flex-1 gap-2"
            >
              {saved ? <><Check size={16} /> Saved!</> : "Save Profile"}
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
