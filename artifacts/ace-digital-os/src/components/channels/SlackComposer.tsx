import { MessageComposer, type MessageComposerProps } from "@/components/channels/MessageComposer";
import { useKeyboardOffset } from "@/hooks/use-keyboard-offset";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/** Slack-styled bordered composer; delegates send/upload/voice to MessageComposer. */
export function SlackComposer(props: MessageComposerProps) {
  const keyboardOffset = useKeyboardOffset();
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        "shrink-0 border-t border-border bg-[var(--chat-composer-bg)]",
        isMobile ? "px-2 py-2" : "px-4 py-3",
      )}
      style={{
        paddingBottom:
          keyboardOffset > 0
            ? `${keyboardOffset}px`
            : "max(0.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <div
        className={cn(
          "overflow-hidden rounded-lg border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] shadow-sm dark:shadow-none",
          isMobile && "rounded-xl",
        )}
      >
        <MessageComposer {...props} slackStyle />
      </div>
    </div>
  );
}
