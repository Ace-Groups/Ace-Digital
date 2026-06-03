import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface MessageActionsMenuProps {
  isMe: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function MessageActionsMenu({
  isMe,
  menuOpen,
  onMenuOpenChange,
  children,
}: MessageActionsMenuProps) {
  const isMobile = useIsMobile();

  return (
    <DropdownMenu open={menuOpen} onOpenChange={onMenuOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9 shrink-0 touch-manipulation text-muted-foreground sm:h-8 sm:w-8",
            "hover:bg-muted/80 hover:text-foreground",
            isMobile
              ? "opacity-90"
              : "opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100",
          )}
          aria-label="Message actions"
        >
          <MoreHorizontal size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isMe ? "end" : "start"}
        side={isMobile ? "top" : "bottom"}
        sideOffset={6}
        className="min-w-[11rem]"
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
