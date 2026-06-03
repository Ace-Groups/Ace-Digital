import { formatMessageDayLabel } from "@/lib/chat-display";

export function DateSeparator({ createdAt }: { createdAt: string }) {
  return (
    <div
      className="my-4 flex items-center gap-3 text-xs font-medium text-muted-foreground"
      role="separator"
    >
      <span className="h-px flex-1 bg-border" />
      {formatMessageDayLabel(createdAt)}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
