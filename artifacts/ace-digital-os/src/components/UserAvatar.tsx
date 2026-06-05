import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { getPresetAvatar, parseAvatarUrl } from "@/lib/avatar";
import { getMascotSrc } from "@/lib/mascots";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  avatarUrl?: string | null;
  fullName?: string;
  className?: string;
  fallbackClassName?: string;
  presetClassName?: string;
  iconSize?: number;
}

export function UserAvatar({
  avatarUrl,
  fullName = "?",
  className,
  fallbackClassName,
  presetClassName,
  iconSize = 18,
}: UserAvatarProps) {
  const parsed = parseAvatarUrl(avatarUrl);
  const initials = getInitials(fullName);

  if (parsed.type === "mascot") {
    const src = getMascotSrc(parsed.value);
    if (src) {
      return (
        <div className={cn("shrink-0 overflow-hidden rounded-full bg-muted", className)}>
          <img src={src} alt={fullName} className="h-full w-full object-cover" />
        </div>
      );
    }
  }

  if (parsed.type === "preset") {
    const preset = getPresetAvatar(parsed.value);
    if (preset) {
      const Icon = preset.icon;
      return (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-full",
            preset.color,
            className,
            presetClassName,
          )}
        >
          <Icon size={iconSize} className="text-white" />
        </div>
      );
    }
  }

  return (
    <Avatar className={className}>
      {parsed.type === "image" ? (
        <AvatarImage src={parsed.value} alt={fullName} className="object-cover" />
      ) : null}
      <AvatarFallback className={fallbackClassName}>{initials}</AvatarFallback>
    </Avatar>
  );
}
