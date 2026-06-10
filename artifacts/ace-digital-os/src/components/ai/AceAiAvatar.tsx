import { cn } from "@/lib/utils";
import { ACE_AI_AVATAR } from "@/lib/ace-ai-brand";

const SIZE_CLASS = {
  xs: "h-5 w-5",
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
} as const;

type AceAiAvatarProps = {
  size?: keyof typeof SIZE_CLASS;
  className?: string;
};

export function AceAiAvatar({ size = "md", className }: AceAiAvatarProps) {
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", SIZE_CLASS[size], className)}
      aria-hidden
    >
      <img
        src={ACE_AI_AVATAR}
        alt="Ace AI"
        className="h-full w-full object-contain object-center mix-blend-lighten dark:mix-blend-normal"
        draggable={false}
      />
    </span>
  );
}
