import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChatWorkspaceProps {
  sidebar: ReactNode;
  main: ReactNode;
  threadPanel?: ReactNode;
  className?: string;
}

/** Three-column Slack-style shell: sidebar | main | optional thread rail. */
export function ChatWorkspace({ sidebar, main, threadPanel, className }: ChatWorkspaceProps) {
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
