import { useState } from "react";
import { MessageSquare, MoreHorizontal, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmojiPickerSheet } from "@/components/channels/EmojiPickerSheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const QUICK = ["👍", "👀", "🙌"];

interface MessageHoverToolbarProps {
  onReact: (emoji: string) => void;
  onReply?: () => void;
  onMore?: () => void;
  className?: string;
}

export function MessageHoverToolbar({
  onReact,
  onReply,
  onMore,
  className,
}: MessageHoverToolbarProps) {
  const isMobile = useIsMobile();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div
      className={cn(
        "z-10 flex items-center gap-0.5",
        isMobile
          ? "relative shrink-0 self-start rounded-lg border border-border dark:border-white/10 bg-background/80 dark:bg-background/60 backdrop-blur-md p-0.5 shadow-brand-sm"
          : "absolute right-2 top-0 translate-y-1 rounded-lg border border-border dark:border-white/10 bg-background/80 dark:bg-background/60 backdrop-blur-md p-0.5 opacity-0 shadow-brand-md transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 sm:right-4",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {!isMobile &&
        QUICK.map((emoji) => (
          <Button
            key={emoji}
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-base"
            aria-label={`React with ${emoji}`}
            onClick={() => onReact(emoji)}
          >
            {emoji}
          </Button>
        ))}
      <EmojiPickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(emoji) => {
          onReact(emoji);
          setPickerOpen(false);
        }}
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(isMobile ? "h-9 w-9" : "h-8 w-8")}
            aria-label="Add reaction"
            onClick={() => setPickerOpen(true)}
          >
            <Smile size={isMobile ? 18 : 16} />
          </Button>
        }
      />
      {onReply && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(isMobile ? "h-9 w-9" : "h-8 w-8")}
          aria-label="Reply in thread"
          onClick={onReply}
        >
          <MessageSquare size={isMobile ? 18 : 16} />
        </Button>
      )}
      {onMore && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(isMobile ? "h-9 w-9" : "h-8 w-8")}
          aria-label="More actions"
          onClick={onMore}
        >
          <MoreHorizontal size={isMobile ? 18 : 16} />
        </Button>
      )}
    </div>
  );
}
