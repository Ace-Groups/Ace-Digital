import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CanvasPanelProps = {
  title?: string;
  icon?: LucideIcon;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
};

export function CanvasPanel({
  title,
  icon: Icon,
  headerRight,
  children,
  className,
  bodyClassName,
  noPadding,
}: CanvasPanelProps) {
  return (
    <div className={cn("dash-panel", className)}>
      {title && (
        <div className="dash-panel-header">
          <span className="dash-panel-title flex items-center gap-2">
            {Icon && <Icon size={16} className="text-primary" aria-hidden />}
            {title}
          </span>
          {headerRight}
        </div>
      )}
      <div
        className={cn(
          !title && !noPadding && "dash-panel-body",
          title && (noPadding ? "p-0" : "dash-panel-body"),
          bodyClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
