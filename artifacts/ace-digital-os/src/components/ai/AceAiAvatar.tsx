import { cn } from "@/lib/utils";
import { ACE_AI_AVATAR } from "@/lib/ace-ai-brand";

const SIZE_CLASS = {
  xs: "h-6 w-6",
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
} as const;

type AceAiAvatarProps = {
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  withRing?: boolean;
};

export function AceAiAvatar({ size = "md", className, withRing }: AceAiAvatarProps) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-primary/10",
        SIZE_CLASS[size],
        withRing && "ring-2 ring-primary/25 ring-offset-2 ring-offset-card",
        className,
      )}
    >
      <img
        src={ACE_AI_AVATAR}
        alt="Ace AI"
        className="h-full w-full object-cover object-top"
        draggable={false}
      />
    </div>
  );
}
