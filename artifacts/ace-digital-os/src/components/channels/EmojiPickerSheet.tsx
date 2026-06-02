import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { CHAT_EMOJI_GROUPS } from "@/lib/chat-emojis";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";
import type { ReactNode } from "react";

interface EmojiPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (emoji: string) => void;
  trigger?: ReactNode;
}

function EmojiGrid({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className="max-h-[min(50dvh,320px)] touch-scroll space-y-4 overflow-y-auto overscroll-contain pr-1">
      {CHAT_EMOJI_GROUPS.map((group) => (
        <div key={group.id}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </p>
          <div
            className={cn(
              "grid grid-cols-8 gap-1 rounded-xl p-2 sm:grid-cols-10",
              group.tint,
            )}
          >
            {group.emojis.map((emoji) => (
              <button
                key={`${group.id}-${emoji}`}
                type="button"
                className="flex h-10 w-full items-center justify-center rounded-lg text-xl transition-transform active:scale-90 hover:bg-background/60 sm:h-9"
                onClick={() => onPick(emoji)}
                aria-label={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmojiPickerSheet({
  open,
  onOpenChange,
  onPick,
  trigger,
}: EmojiPickerSheetProps) {
  const isMobile = useIsMobile();

  const handlePick = (emoji: string) => {
    onPick(emoji);
    onOpenChange(false);
  };

  const defaultTrigger = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-11 w-11 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
      aria-label="Add emoji"
    >
      <Smile size={22} className="text-amber-500" />
    </Button>
  );

  if (isMobile) {
    return (
      <>
        <div onClick={() => onOpenChange(true)}>{trigger ?? defaultTrigger}</div>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="pb-[max(1rem,env(safe-area-inset-bottom))]">
            <DrawerHeader className="text-left">
              <DrawerTitle>Emoji</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-2">
              <EmojiGrid onPick={handlePick} />
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger ?? defaultTrigger}</PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-[min(100vw-2rem,22rem)] p-3"
      >
        <EmojiGrid onPick={handlePick} />
      </PopoverContent>
    </Popover>
  );
}
