import { formatMessageDayLabel } from "@/lib/chat-display";

export function DateSeparator({ createdAt }: { createdAt: string }) {
  return (
    <div
      className="my-2 flex items-center gap-2 text-[11px] font-medium text-muted-foreground"
      role="separator"
    >
      <span className="h-px flex-1 bg-border" />
      {formatMessageDayLabel(createdAt)}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
