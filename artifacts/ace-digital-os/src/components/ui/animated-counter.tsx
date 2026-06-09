import { useEffect, useRef, useState } from "react";
import { animate, type AnimationPlaybackControls } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  formatter?: (n: number) => string;
  className?: string;
}

/**
 * Spring-animated number counter. Counts from 0 to target value on mount
 * and re-animates when value changes. Uses framer-motion's animate()
 * for smooth spring physics instead of linear interpolation.
 */
export function AnimatedCounter({
  value,
  duration = 1.2,
  formatter = (n) => String(Math.round(n)),
  className,
}: AnimatedCounterProps) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const controlsRef = useRef<AnimationPlaybackControls | null>(null);
  const [display, setDisplay] = useState(() => formatter(0));

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    controlsRef.current?.stop();
    controlsRef.current = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(latest) {
        setDisplay(formatter(latest));
      },
    });

    return () => {
      controlsRef.current?.stop();
    };
  }, [value, duration, formatter]);

  return (
    <span ref={nodeRef} className={className}>
      {display}
    </span>
  );
}

/** Format a number with Indian comma notation (1,23,456) */
export function formatIndianNumber(n: number): string {
  const [intPart, decPart] = String(n).split(".");
  const last3 = intPart.slice(-3);
  const other = intPart.slice(0, -3);
  const formatted = other
    ? other.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3
    : last3;
  return decPart ? `${formatted}.${decPart}` : formatted;
}
