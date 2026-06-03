import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  getMessageMenuPosition,
  saveMessageMenuPosition,
  type MessageMenuOffset,
} from "@/lib/message-menu-positions";
import { useIsMobile } from "@/hooks/use-mobile";

const LONG_PRESS_MS = 420;
const DRAG_THRESHOLD_PX = 6;

interface MessageActionsMenuProps {
  messageId: number;
  channelId: number;
  isMe: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function MessageActionsMenu({
  messageId,
  channelId,
  isMe,
  menuOpen,
  onMenuOpenChange,
  children,
}: MessageActionsMenuProps) {
  const isMobile = useIsMobile();
  const anchorRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragOrigin = useRef<{ pointerX: number; pointerY: number; offsetX: number; offsetY: number } | null>(
    null,
  );
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const movedDuringPress = useRef(false);

  const [offset, setOffset] = useState<MessageMenuOffset>(() =>
    getMessageMenuPosition(channelId, messageId),
  );
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setOffset(getMessageMenuPosition(channelId, messageId));
  }, [channelId, messageId]);

  const persistOffset = useCallback(
    (next: MessageMenuOffset) => {
      setOffset(next);
      saveMessageMenuPosition(channelId, messageId, next);
    },
    [channelId, messageId],
  );

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const startDrag = useCallback(
    (clientX: number, clientY: number) => {
      onMenuOpenChange(false);
      dragOrigin.current = {
        pointerX: clientX,
        pointerY: clientY,
        offsetX: offset.x,
        offsetY: offset.y,
      };
      setDragging(true);
    },
    [offset.x, offset.y, onMenuOpenChange],
  );

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      const origin = dragOrigin.current;
      if (!origin) return;
      persistOffset({
        x: origin.offsetX + (e.clientX - origin.pointerX),
        y: origin.offsetY + (e.clientY - origin.pointerY),
      });
    };

    const onUp = () => {
      dragOrigin.current = null;
      setDragging(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, persistOffset]);

  const displaced =
    Math.abs(offset.x) > 32 || Math.abs(offset.y) > 40;

  return (
    <div
      ref={anchorRef}
      className={cn(
        "pointer-events-auto absolute z-20",
        isMe ? "right-0" : "left-0",
        dragging && "z-[60]",
      )}
      style={{
        top: 0,
        transform: `translate(${offset.x}px, ${offset.y}px)`,
      }}
    >
      <DropdownMenu open={menuOpen} onOpenChange={onMenuOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            id={`msg-menu-${messageId}`}
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-11 w-11 border border-dashed sm:h-8 sm:w-8",
              displaced
                ? "rotate-[-4deg] border-amber-500/50 bg-background/95 shadow-md"
                : "border-muted-foreground/35 bg-muted/40",
              dragging && "scale-110 border-primary ring-2 ring-primary/40",
              isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
            aria-label="Message actions. Long-press or right-click to move."
            onContextMenu={(e) => {
              e.preventDefault();
              startDrag(e.clientX, e.clientY);
            }}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              movedDuringPress.current = false;
              pressStart.current = { x: e.clientX, y: e.clientY };
              clearLongPress();
              const startX = e.clientX;
              const startY = e.clientY;
              longPressTimer.current = setTimeout(() => {
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                startDrag(startX, startY);
              }, LONG_PRESS_MS);
            }}
            onPointerMove={(e) => {
              const start = pressStart.current;
              if (!start || !longPressTimer.current) return;
              if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_THRESHOLD_PX) {
                movedDuringPress.current = true;
                clearLongPress();
              }
            }}
            onPointerUp={(e) => {
              clearLongPress();
              pressStart.current = null;
              if (dragging) {
                e.preventDefault();
                return;
              }
              if (movedDuringPress.current) {
                e.preventDefault();
              }
            }}
            onClick={(e) => {
              if (dragging || movedDuringPress.current) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            <MoreHorizontal size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isMe ? "end" : "start"} className="min-w-[10rem]">
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
