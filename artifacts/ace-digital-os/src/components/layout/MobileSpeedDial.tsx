import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Plus, CheckSquare, FolderKanban, Users2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { hapticLight, hapticMedium } from "@/lib/haptics";

const DIAL_ACTIONS = [
  { icon: CheckSquare, label: "Task", href: "/tasks?new=true", color: "bg-blue-500" },
  { icon: FolderKanban, label: "Project", href: "/projects?new=true", color: "bg-indigo-500" },
  { icon: Users2, label: "Team", href: "/teams?new=true", color: "bg-emerald-500" },
];

export function MobileSpeedDial() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  const toggle = useCallback((e?: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    hapticMedium();
    setOpen((prev) => !prev);
  }, []);

  const handleAction = useCallback((href: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    hapticLight();
    setOpen(false);
    setLocation(href);
  }, [setLocation]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm touch-manipulation"
            onClick={toggle}
            onTouchEnd={(e) => { e.preventDefault(); toggle(e); }}
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3 pb-[env(safe-area-inset-bottom)]">
        <AnimatePresence>
          {open && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                visible: { transition: { staggerChildren: 0.05, delayChildren: 0 } },
                hidden: { transition: { staggerChildren: 0.05, staggerDirection: -1 } },
              }}
              className="flex flex-col items-end gap-3"
            >
              {DIAL_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={(e) => handleAction(action.href, e)}
                  className="flex items-center gap-3 active:scale-95 transition-transform touch-manipulation"
                >
                  <span className="rounded-lg bg-card px-2.5 py-1 text-xs font-medium shadow-sm border border-border/50 text-foreground pointer-events-none">
                    {action.label}
                  </span>
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg pointer-events-none", action.color)}>
                    <action.icon size={20} strokeWidth={2.5} />
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={(e) => toggle(e)}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full shadow-brand-lg transition-all duration-200 touch-manipulation active:scale-90",
            open ? "bg-muted text-foreground rotate-45" : "bg-primary text-primary-foreground"
          )}
        >
          {open ? <X size={24} /> : <Plus size={24} />}
        </button>
      </div>
    </>
  );
}
