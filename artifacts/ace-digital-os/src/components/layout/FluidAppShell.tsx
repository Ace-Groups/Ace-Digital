import type { ReactNode } from "react";
import { GlassAppShell } from "@/components/design/glass-container";
import { FluidRouteTransition } from "@/components/design/fluid-motion";

/**
 * Global UI wrapper — glass ambient shell + fluid page transitions.
 * Wrap authenticated and public routes for consistent motion language.
 */
export function FluidAppShell({ children }: { children: ReactNode }) {
  return (
    <GlassAppShell className="v2-ambient-bg">
      <FluidRouteTransition>{children}</FluidRouteTransition>
    </GlassAppShell>
  );
}
