import { MessageComposer, type MessageComposerProps } from "@/components/channels/MessageComposer";
import { cn } from "@/lib/utils";

/** Slack-styled bordered composer; delegates send/upload/voice to MessageComposer. */
export function SlackComposer(props: MessageComposerProps) {
  return (
    <div className="shrink-0 border-t border-border bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div
        className={cn(
          "overflow-hidden rounded-lg border border-[var(--chat-composer-border)] bg-card shadow-sm",
        )}
      >
        <MessageComposer {...props} slackStyle />
      </div>
    </div>
  );
}
