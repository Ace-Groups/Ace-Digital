import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { springSoft } from "./motion";

interface SurfaceCardProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
  glow?: boolean;
}

const paddingMap = {
  none: "",
  sm: "p-3",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
};

export function SurfaceCard({
  children,
  className,
  padding = "md",
  interactive = false,
  glow = false,
}: SurfaceCardProps) {
  const reduced = useReducedMotion();
  const baseClass = cn(
    "rounded-2xl border border-border/60 bg-card/95 shadow-v2-sm backdrop-blur-sm",
    glow && "v2-glow-ring",
    interactive && "v2-surface-interactive cursor-pointer",
    paddingMap[padding],
    className,
  );

  if (!interactive || reduced) {
    return <div className={baseClass}>{children}</div>;
  }

  return (
    <motion.div
      className={baseClass}
      whileTap={{ scale: 0.985 }}
      transition={springSoft}
    >
      {children}
    </motion.div>
  );
}
