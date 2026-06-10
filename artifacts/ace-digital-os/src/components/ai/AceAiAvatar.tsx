import { cn } from "@/lib/utils";
import { ACE_AI_AVATAR } from "@/lib/ace-ai-brand";

const SIZE_CLASS = {
  xs: "h-6 w-6",
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-11 w-11",
} as const;

type AceAiAvatarProps = {
  size?: keyof typeof SIZE_CLASS;
  className?: string;
};

export function AceAiAvatar({ size = "md", className }: AceAiAvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "bg-[#0b1020] ring-1 ring-primary/30 shadow-sm",
        SIZE_CLASS[size],
        className,
      )}
      aria-hidden
    >
      <img
        src={ACE_AI_AVATAR}
        alt="Ace AI"
        className="h-[92%] w-[92%] object-contain object-center"
        draggable={false}
      />
    </span>
  );
}
