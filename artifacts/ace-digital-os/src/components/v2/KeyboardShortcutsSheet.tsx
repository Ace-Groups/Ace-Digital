import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { hapticSheetOpen } from "@/lib/haptics";

const SHORTCUTS = [
  { keys: ["⌘", "K"], label: "Open command palette" },
  { keys: ["⌘", "/"], label: "Keyboard shortcuts" },
  { keys: ["⌘", "B"], label: "Toggle sidebar (desktop)" },
  { keys: ["⌘", "N"], label: "Quick create" },
  { keys: ["⌘", "J"], label: "Open Ace Assistant" },
  { keys: ["Esc"], label: "Close dialogs" },
  { keys: ["G", "D"], label: "Go to Dashboard" },
  { keys: ["G", "C"], label: "Go to Channels" },
  { keys: ["G", "T"], label: "Go to Tasks" },
];

export function KeyboardShortcutsSheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "/" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
        hapticSheetOpen();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-[env(safe-area-inset-bottom)] sm:max-w-md sm:mx-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Keyboard size={18} className="text-primary" />
            Keyboard shortcuts
          </SheetTitle>
        </SheetHeader>
        <ul className="mt-6 space-y-3">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded-lg border border-border bg-muted/50 px-2 py-1 font-mono text-[10px] font-semibold"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
