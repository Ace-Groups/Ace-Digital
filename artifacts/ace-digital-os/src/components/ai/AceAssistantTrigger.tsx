import { cn } from "@/lib/utils";
import { useAceAssistant } from "@/contexts/AceAssistantContext";
import { AceAiAvatar } from "@/components/ai/AceAiAvatar";

type AceAssistantTriggerProps = {
  collapsed?: boolean;
  className?: string;
};

export function AceAssistantTrigger({ collapsed, className }: AceAssistantTriggerProps) {
  const { toggle } = useAceAssistant();

  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="btn-ask-ace"
      className={cn(
        "flex items-center rounded-lg text-sm font-medium transition-all duration-200",
        "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        collapsed ? "mx-auto h-10 w-10 justify-center p-0" : "w-full gap-3 px-3 py-2.5",
        className,
      )}
      aria-label="Ask Ace AI"
    >
      <AceAiAvatar size="sm" />
      {!collapsed && <span>Ask Ace</span>}
    </button>
  );
}
