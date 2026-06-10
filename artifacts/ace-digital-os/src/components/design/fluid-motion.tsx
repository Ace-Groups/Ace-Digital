import { AnimatePresence, motion, type HTMLMotionProps, type Transition } from "framer-motion";
import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/** Low-damping spring — water-like, fluid layout transitions (Reanimated-style on web). */
export const fluidSpring: Transition = {
  type: "spring",
  stiffness: 120,
  damping: 14,
  mass: 0.85,
};

export const fluidSpringSoft: Transition = {
  type: "spring",
  stiffness: 90,
  damping: 16,
  mass: 1,
};

export const fluidSpringSnappy: Transition = {
  type: "spring",
  stiffness: 180,
  damping: 18,
  mass: 0.7,
};

type FluidMotionProps = {
  children: ReactNode;
  className?: string;
};

/** Page-level enter transition with fluid spring physics. */
export function FluidPageTransition({ children, className }: FluidMotionProps) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
      transition={fluidSpring}
    >
      {children}
    </motion.div>
  );
}

/** Wraps routed pages — keys on pathname for cross-route fluid transitions. */
export function FluidRouteTransition({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const reduced = useReducedMotion();

  if (reduced) return <>{children}</>;

  return (
    <AnimatePresence mode="wait">
      <FluidPageTransition key={location}>{children}</FluidPageTransition>
    </AnimatePresence>
  );
}

/** Modal / sheet mount — scales up with overshoot spring. */
export function FluidModalSurface({ children, className }: FluidMotionProps) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.94, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: 8 }}
      transition={fluidSpringSoft}
    >
      {children}
    </motion.div>
  );
}

/** Collapsible panel — height morph with spring. */
export function FluidCollapse({
  open,
  children,
  className,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return open ? <div className={className}>{children}</div> : null;

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key="fluid-collapse"
          className={cn("overflow-hidden", className)}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={fluidSpring}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Tactile press with fluid spring rebound. */
export function FluidPressable({
  className,
  children,
  ...props
}: HTMLMotionProps<"button">) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      type="button"
      whileTap={reduced ? undefined : { scale: 0.97 }}
      whileHover={reduced ? undefined : { scale: 1.01 }}
      transition={fluidSpringSnappy}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}
