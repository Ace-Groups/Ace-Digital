import { useRef } from "react";
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from "framer-motion";
import { Trash2, CheckCircle2 } from "lucide-react";
import { hapticHeavy, hapticMedium, hapticLight } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type { Task } from "@workspace/api-client-react";

interface SwipeableTaskRowProps {
  task: Task;
  children: React.ReactNode;
  onDelete?: () => void;
  onComplete?: () => void;
  canDelete?: boolean;
  canComplete?: boolean;
  isDone?: boolean;
}

const SWIPE_THRESHOLD = 80;

export function SwipeableTaskRow({
  task,
  children,
  onDelete,
  onComplete,
  canDelete = false,
  canComplete = false,
  isDone = false,
}: SwipeableTaskRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const controls = useAnimation();

  const isDragging = useRef(false);
  const triggerRef = useRef<"delete" | "complete" | null>(null);

  const background = useTransform(
    x,
    [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    [
      canDelete ? "hsl(var(--destructive) / 0.9)" : "hsl(var(--muted))",
      "hsl(var(--muted))",
      canComplete ? "hsl(var(--primary) / 0.9)" : "hsl(var(--muted))",
    ]
  );

  const scaleLeft = useTransform(x, [0, SWIPE_THRESHOLD], [0.5, 1.2]);
  const scaleRight = useTransform(x, [-SWIPE_THRESHOLD, 0], [1.2, 0.5]);

  const handleDragEnd = async (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    isDragging.current = false;
    const offset = info.offset.x;
    
    if (offset > SWIPE_THRESHOLD && canComplete && onComplete) {
      hapticHeavy();
      await controls.start({ x: window.innerWidth, transition: { duration: 0.2 } });
      onComplete();
    } else if (offset < -SWIPE_THRESHOLD && canDelete && onDelete) {
      hapticHeavy();
      await controls.start({ x: -window.innerWidth, transition: { duration: 0.2 } });
      onDelete();
      // Snap back if delete is a confirmation dialog (usually the case)
      controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 30 } });
    } else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 30 } });
    }
    triggerRef.current = null;
  };

  const handleDrag = (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!isDragging.current) isDragging.current = true;
    
    const offset = info.offset.x;
    if (offset > SWIPE_THRESHOLD && triggerRef.current !== "complete" && canComplete) {
      hapticMedium();
      triggerRef.current = "complete";
    } else if (offset < -SWIPE_THRESHOLD && triggerRef.current !== "delete" && canDelete) {
      hapticMedium();
      triggerRef.current = "delete";
    } else if (Math.abs(offset) < SWIPE_THRESHOLD && triggerRef.current !== null) {
      triggerRef.current = null;
    }
  };

  return (
    <div className="relative w-full overflow-hidden" ref={containerRef}>
      <motion.div 
        style={{ background }}
        className="absolute inset-0 flex items-center justify-between px-6"
      >
        <motion.div style={{ scale: scaleLeft }} className="flex items-center text-primary-foreground">
          {canComplete && <CheckCircle2 size={28} />}
        </motion.div>
        <motion.div style={{ scale: scaleRight }} className="flex items-center text-destructive-foreground">
          {canDelete && <Trash2 size={28} />}
        </motion.div>
      </motion.div>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className={cn(
          "relative z-10 w-full bg-card shadow-sm border-b border-border/40 touch-pan-y"
        )}
      >
        {children}
      </motion.div>
    </div>
  );
}
