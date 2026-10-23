import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Plus,
  CheckSquare,
  FolderKanban,
  Calendar,
  StickyNote,
  Ticket,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { hapticLight, hapticSheetOpen } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const ACTIONS = [
  { icon: CheckSquare, label: "Task", href: "/tasks?create=1" },
  { icon: FolderKanban, label: "Project", href: "/projects?create=1" },
  { icon: Calendar, label: "Event", href: "/calendar?create=1" },
  { icon: StickyNote, label: "Note", href: "/notes?create=1" },
  { icon: Ticket, label: "Ticket", href: "/service?create=1" },
];

export function QuickCreateFab() {
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const [location, setLocation] = useLocation();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  if (!isAuthenticated || !isMobile || location === "/") return null;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-4 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {open &&
            ACTIONS.map((action, i) => (
              <motion.button
                key={action.href}
                type="button"
                initial={{ opacity: 0, y: 12, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.9 }}
                transition={reduceMotion ? { duration: 0 } : { delay: i * 0.04 }}
                onClick={() => {
                  hapticLight();
                  setLocation(action.href);
                  setOpen(false);
                }}
                className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card/95 px-4 py-2.5 text-sm font-medium shadow-v2-md backdrop-blur-xl"
              >
                <action.icon size={16} className="text-foreground" />
                {action.label}
              </motion.button>
            ))}
        </AnimatePresence>

        <motion.button
          type="button"
          className={cn("v2-fab", open && "rotate-45")}
          onClick={() => {
            hapticSheetOpen();
            setOpen((o) => !o);
          }}
          aria-label="Quick create"
          whileTap={reduceMotion ? undefined : { scale: 0.94 }}
        >
          <Plus size={24} />
        </motion.button>
      </div>
    </>
  );
}
