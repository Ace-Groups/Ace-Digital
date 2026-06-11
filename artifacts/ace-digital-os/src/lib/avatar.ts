import {
  User, Code2, Palette, TrendingUp, DollarSign,
  Settings, Users, Smile,
} from "lucide-react";
import { MASCOT_PREFIX } from "./mascots";

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
const IDENTITY_PREFIX = "identity:";

export type EmployeeIdentityImages = {
  profilePhotoUrl: string | null;
  mascotId: string | null;
};

export type ParsedAvatar =
  | { type: "image"; value: string }
  | { type: "preset"; value: PresetAvatarId }
  | { type: "mascot"; value: string }
  | { type: null; value: null };

export function parseAvatarUrl(avatarUrl: string | null | undefined): ParsedAvatar {
  if (!avatarUrl) return { type: null, value: null };
  if (avatarUrl.startsWith(IDENTITY_PREFIX)) {
    const identity = parseEmployeeIdentityImages(avatarUrl);
    if (identity.mascotId) {
      return { type: "mascot", value: identity.mascotId };
    }
    if (identity.profilePhotoUrl) {
      return { type: "image", value: identity.profilePhotoUrl };
    }
    return { type: null, value: null };
  }
  if (avatarUrl.startsWith(MASCOT_PREFIX)) {
    return { type: "mascot", value: avatarUrl.slice(MASCOT_PREFIX.length) };
  }
  if (avatarUrl.startsWith(PRESET_PREFIX)) {
    const id = avatarUrl.slice(PRESET_PREFIX.length) as PresetAvatarId;
    if (PRESET_AVATARS.some((p) => p.id === id)) {
      return { type: "preset", value: id };
    }
    return { type: null, value: null };
  }
  return { type: "image", value: avatarUrl };
}

/** Profile headshot from identity encoding (ignores app mascot). */
export function getProfilePhotoUrl(avatarUrl: string | null | undefined): string | null {
  return parseEmployeeIdentityImages(avatarUrl).profilePhotoUrl;
}

export function parseEmployeeIdentityImages(
  avatarUrl: string | null | undefined,
): EmployeeIdentityImages {
  if (!avatarUrl) return { profilePhotoUrl: null, mascotId: null };
  if (avatarUrl.startsWith(IDENTITY_PREFIX)) {
    try {
      const parsed = JSON.parse(decodeURIComponent(avatarUrl.slice(IDENTITY_PREFIX.length))) as {
        profilePhotoUrl?: unknown;
        mascotId?: unknown;
      };
      return {
        profilePhotoUrl: typeof parsed.profilePhotoUrl === "string" ? parsed.profilePhotoUrl : null,
        mascotId: typeof parsed.mascotId === "string" ? parsed.mascotId : null,
      };
    } catch {
      return { profilePhotoUrl: null, mascotId: null };
    }
  }
  if (avatarUrl.startsWith(MASCOT_PREFIX)) {
    return { profilePhotoUrl: null, mascotId: avatarUrl.slice(MASCOT_PREFIX.length) };
  }
  if (avatarUrl.startsWith(PRESET_PREFIX)) {
    return { profilePhotoUrl: null, mascotId: null };
  }
  return { profilePhotoUrl: avatarUrl, mascotId: null };
}

export function encodeEmployeeIdentityImages({
  profilePhotoUrl,
  mascotId,
}: EmployeeIdentityImages): string | null {
  if (!profilePhotoUrl && !mascotId) return null;
  if (!profilePhotoUrl && mascotId) return `${MASCOT_PREFIX}${mascotId}`;
  return `${IDENTITY_PREFIX}${encodeURIComponent(
    JSON.stringify({
      profilePhotoUrl,
      mascotId,
    }),
  )}`;
}

export function encodeAvatarUrl(
  imageData: string | null,
  mascotOrPresetId: string | null,
  kind: "mascot" | "preset" = "mascot",
): string | null {
  if (imageData) return imageData;
  if (mascotOrPresetId) {
    return kind === "preset"
      ? `${PRESET_PREFIX}${mascotOrPresetId}`
      : `${MASCOT_PREFIX}${mascotOrPresetId}`;
  }
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
