import type { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface ChatWorkspaceProps {
  sidebar: ReactNode;
  main: ReactNode;
  threadPanel?: ReactNode;
  className?: string;
  selectedChannelId?: number | null;
  onClearSelection?: () => void;
}

/** Three-column Slack-style shell: sidebar | main | optional thread rail. */
export function ChatWorkspace({
  sidebar,
  main,
  threadPanel,
  className,
  selectedChannelId,
  onClearSelection,
}: ChatWorkspaceProps) {
  const isMobile = useIsMobile();
  const hasSelection = selectedChannelId !== null && selectedChannelId !== undefined;

  if (isMobile) {
    return (
      <div className={cn("flex h-[100dvh] w-full overflow-hidden bg-[var(--chat-bg)]", className)}>
        {!hasSelection ? (
          <div className="flex h-full w-full flex-col overflow-hidden">
            {sidebar}
          </div>
        ) : (
          <div className="flex h-full w-full flex-col overflow-hidden">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {main}
            </div>
            {threadPanel}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-1 overflow-hidden bg-[var(--chat-bg)]",
        className,
      )}
    >
      {sidebar}
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l border-border bg-[var(--chat-bg)]">
          {main}
        </div>
        {threadPanel}
      </div>
    </div>
  );
}
