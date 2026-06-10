import { useCallback, useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { hapticSuccess } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
  disabled?: boolean;
}

export function PullToRefresh({ children, onRefresh, className, disabled }: PullToRefreshProps) {
  const reduced = useReducedMotion();
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pull = useMotionValue(0);
  const indicatorOpacity = useTransform(pull, [0, 60], [0, 1]);
  const indicatorRotate = useTransform(pull, [0, 80], [0, 360]);

  const handleRefresh = useCallback(async () => {
    if (refreshing || disabled) return;
    setRefreshing(true);
    try {
      await onRefresh();
      hapticSuccess();
    } finally {
      setRefreshing(false);
      pull.set(0);
    }
  }, [disabled, onRefresh, pull, refreshing]);

  if (reduced || disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={cn("relative", className)}
      onTouchStart={(e) => {
        if (window.scrollY <= 0) startY.current = e.touches[0].clientY;
      }}
      onTouchMove={(e) => {
        if (refreshing || window.scrollY > 0) return;
        const delta = e.touches[0].clientY - startY.current;
        if (delta > 0) pull.set(Math.min(delta * 0.4, 80));
      }}
      onTouchEnd={async () => {
        if (pull.get() > 55) await handleRefresh();
        else pull.set(0);
      }}
    >
      <motion.div
        className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex justify-center pt-2"
        style={{ opacity: indicatorOpacity }}
      >
        <motion.div style={{ rotate: indicatorRotate }}>
          <Loader2
            size={20}
            className={cn("text-primary", refreshing && "animate-spin")}
          />
        </motion.div>
      </motion.div>
      <motion.div style={{ translateY: pull }}>{children}</motion.div>
    </div>
  );
}
