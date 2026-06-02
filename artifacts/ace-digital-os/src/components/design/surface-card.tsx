import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SurfaceCardProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
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
}: SurfaceCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card shadow-brand-sm",
        interactive && "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.99]",
        paddingMap[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
