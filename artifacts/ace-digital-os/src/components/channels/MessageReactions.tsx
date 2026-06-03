import type { Message } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

type ReactionsMap = Record<string, number[]>;

function parseReactions(metadata: Message["metadata"]): ReactionsMap {
  if (!metadata || typeof metadata !== "object") return {};
  const r = (metadata as Record<string, unknown>).reactions;
  if (!r || typeof r !== "object") return {};
  return r as ReactionsMap;
}

interface MessageReactionsProps {
  msg: Message;
  currentUserId?: number;
  onToggle: (emoji: string) => void;
  className?: string;
}

export function MessageReactions({
  msg,
  currentUserId,
  onToggle,
  className,
}: MessageReactionsProps) {
  const reactions = parseReactions(msg.metadata);
  const entries = Object.entries(reactions).filter(([, ids]) => ids.length > 0);
  if (!entries.length) return null;

  return (
    <div className={cn("mt-1 flex flex-wrap gap-1", className)}>
      {entries.map(([emoji, userIds]) => {
        const active = currentUserId != null && userIds.includes(currentUserId);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggle(emoji)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
              active
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-border bg-background/80 text-muted-foreground hover:bg-muted",
            )}
          >
            <span>{emoji}</span>
            <span className="tabular-nums">{userIds.length}</span>
          </button>
        );
      })}
    </div>
  );
}
