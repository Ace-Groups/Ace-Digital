import { useState } from "react";
import { MessageSquare, MoreHorizontal, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmojiPickerSheet } from "@/components/channels/EmojiPickerSheet";
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
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div
      className={cn(
        "absolute right-4 top-0 z-10 flex translate-y-1 items-center gap-0.5 rounded-lg border border-border bg-popover p-0.5 opacity-0 shadow-md transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {QUICK.map((emoji) => (
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
            className="h-8 w-8"
            aria-label="Add reaction"
            onClick={() => setPickerOpen(true)}
          >
            <Smile size={16} />
          </Button>
        }
      />
      {onReply && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Reply in thread"
          onClick={onReply}
        >
          <MessageSquare size={16} />
        </Button>
      )}
      {onMore && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="More actions"
          onClick={onMore}
        >
          <MoreHorizontal size={16} />
        </Button>
      )}
    </div>
  );
}
