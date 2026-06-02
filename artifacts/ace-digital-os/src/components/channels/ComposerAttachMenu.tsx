import { FileText, ImageIcon, Paperclip } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ComposerAttachMenuProps {
  disabled?: boolean;
  onOpenMedia: () => void;
  onOpenFiles: () => void;
  className?: string;
}

export function ComposerAttachMenu({
  disabled,
  onOpenMedia,
  onOpenFiles,
  className,
}: ComposerAttachMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors",
            "hover:bg-muted/80 active:bg-muted disabled:opacity-40",
            className,
          )}
          aria-label="Attach"
        >
          <Paperclip size={20} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-48">
        <DropdownMenuItem
          className="gap-3 min-h-11"
          onSelect={(e) => {
            e.preventDefault();
            onOpenMedia();
          }}
        >
          <ImageIcon size={18} className="text-emerald-500" />
          Photos &amp; videos
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-3 min-h-11"
          onSelect={(e) => {
            e.preventDefault();
            onOpenFiles();
          }}
        >
          <FileText size={18} className="text-sky-500" />
          Document
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
