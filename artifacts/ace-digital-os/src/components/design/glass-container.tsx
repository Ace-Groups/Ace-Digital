import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type GlassVariant = "panel" | "card" | "header" | "neon" | "cyber";

const variantClass: Record<GlassVariant, string> = {
  panel: "glass-panel",
  card: "glass-card",
  header: "glass-header",
  neon: "tech-glass-neon",
  cyber: "tech-glass",
};

type GlassContainerProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  variant?: GlassVariant;
  glow?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
};

const paddingMap = {
  none: "",
  sm: "p-3",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
};

/**
 * Frosted glass surface — cyberpunk/minimalist shell primitive.
 * Uses GPU-accelerated backdrop-blur from global CSS tokens.
 */
export function GlassContainer({
  children,
  className,
  variant = "panel",
  glow = false,
  padding = "none",
  ...props
}: GlassContainerProps) {
  return (
    <div
      className={cn(
        "rounded-2xl",
        variantClass[variant],
        paddingMap[padding],
        glow && "ring-1 ring-primary/25 shadow-[0_0_24px_hsl(var(--primary)/0.12)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Full-app ambient backdrop with deep dark undertones + subtle cyan mesh. */
export function GlassAppShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative min-h-[100dvh] bg-background text-foreground", className)}>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-[20%] -left-[10%] h-[50vh] w-[50vw] rounded-full bg-primary/8 blur-[100px]" />
        <div className="absolute top-[40%] -right-[15%] h-[40vh] w-[45vw] rounded-full bg-violet-500/6 blur-[120px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background to-background" />
      </div>
      {children}
    </div>
  );
}

/** Elevated glass card for dashboards and editors. */
export function GlassCard({
  children,
  className,
  interactive = false,
  padding = "md",
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  padding?: GlassContainerProps["padding"];
}) {
  return (
    <GlassContainer
      variant="card"
      padding={padding}
      className={cn(
        interactive &&
          "transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-brand-md",
        className,
      )}
    >
      {children}
    </GlassContainer>
  );
}
