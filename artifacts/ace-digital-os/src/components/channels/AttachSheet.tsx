import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BarChart3, CalendarDays, FileText, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type AttachAction = "gallery" | "document" | "poll" | "event";

interface AttachSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (action: AttachAction) => void;
}

const TILES: {
  action: AttachAction;
  label: string;
  icon: typeof ImageIcon;
  color: string;
}[] = [
  { action: "gallery", label: "Gallery", icon: ImageIcon, color: "text-sky-400 bg-sky-500/15" },
  { action: "document", label: "Document", icon: FileText, color: "text-violet-400 bg-violet-500/15" },
  { action: "poll", label: "Poll", icon: BarChart3, color: "text-amber-400 bg-amber-500/15" },
  { action: "event", label: "Event", icon: CalendarDays, color: "text-rose-400 bg-rose-500/15" },
];

function AttachGrid({ onAction, onClose }: { onAction: (a: AttachAction) => void; onClose: () => void }) {
  return (
    <div className="grid grid-cols-4 gap-3 px-1 pb-2 sm:grid-cols-4">
      {TILES.map(({ action, label, icon: Icon, color }) => (
        <button
          key={action}
          type="button"
          data-testid={`attach-${action}`}
          className="flex flex-col items-center gap-2 rounded-2xl p-2 transition-transform active:scale-95"
          onClick={() => {
            onAction(action);
            onClose();
          }}
        >
          <span
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl",
              color.split(" ").slice(1).join(" "),
            )}
          >
            <Icon size={26} className={color.split(" ")[0]} />
          </span>
          <span className="text-center text-[11px] font-medium text-muted-foreground">{label}</span>
        </button>
      ))}
    </div>
  );
}

export function AttachSheet({ open, onOpenChange, onAction }: AttachSheetProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="pb-[max(1rem,env(safe-area-inset-bottom))]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Share</DrawerTitle>
          </DrawerHeader>
          <AttachGrid onAction={onAction} onClose={() => onOpenChange(false)} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
          <DialogDescription className="sr-only">
            Choose what to attach to your message
          </DialogDescription>
        </DialogHeader>
        <AttachGrid onAction={onAction} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
