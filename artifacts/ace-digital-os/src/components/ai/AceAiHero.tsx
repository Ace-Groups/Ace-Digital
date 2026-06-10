import { cn } from "@/lib/utils";
import { ACE_AI_HERO } from "@/lib/ace-ai-brand";

type AceAiHeroProps = {
  className?: string;
};

export function AceAiHero({ className }: AceAiHeroProps) {
  return (
    <img
      src={ACE_AI_HERO}
      alt="Ace AI — Here to help"
      className={cn("mx-auto w-full max-w-[260px] object-contain", className)}
      draggable={false}
    />
  );
}
