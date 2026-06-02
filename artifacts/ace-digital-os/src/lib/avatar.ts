import {
  User, Code2, Palette, TrendingUp, DollarSign,
  Settings, Users, Smile,
} from "lucide-react";

export const PRESET_AVATARS = [
  { id: "user", icon: User, label: "Default", color: "bg-slate-500" },
  { id: "code", icon: Code2, label: "Engineer", color: "bg-blue-600" },
  { id: "design", icon: Palette, label: "Designer", color: "bg-purple-600" },
  { id: "sales", icon: TrendingUp, label: "Sales", color: "bg-amber-600" },
  { id: "finance", icon: DollarSign, label: "Finance", color: "bg-emerald-600" },
  { id: "hr", icon: Users, label: "HR", color: "bg-pink-600" },
  { id: "ops", icon: Settings, label: "Ops", color: "bg-orange-600" },
  { id: "mgmt", icon: Smile, label: "Mgmt", color: "bg-primary" },
] as const;

export type PresetAvatarId = (typeof PRESET_AVATARS)[number]["id"];

const PRESET_PREFIX = "preset:";

export type ParsedAvatar =
  | { type: "image"; value: string }
  | { type: "preset"; value: PresetAvatarId }
  | { type: null; value: null };

export function parseAvatarUrl(avatarUrl: string | null | undefined): ParsedAvatar {
  if (!avatarUrl) return { type: null, value: null };
  if (avatarUrl.startsWith(PRESET_PREFIX)) {
    const id = avatarUrl.slice(PRESET_PREFIX.length) as PresetAvatarId;
    if (PRESET_AVATARS.some((p) => p.id === id)) {
      return { type: "preset", value: id };
    }
    return { type: null, value: null };
  }
  return { type: "image", value: avatarUrl };
}

export function encodeAvatarUrl(
  imageData: string | null,
  presetId: string | null,
): string | null {
  if (imageData) return imageData;
  if (presetId) return `${PRESET_PREFIX}${presetId}`;
  return null;
}

export function getPresetAvatar(id: string) {
  return PRESET_AVATARS.find((p) => p.id === id);
}

/** Resize and compress image for storage (Firestore 1MB doc limit). */
export function resizeImageFile(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = ev.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
