import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  const isMobile = useIsMobile();
  return (
    <div
      className={cn(
        "flex gap-3",
        isMobile ? "flex-col items-stretch" : "flex-row items-end justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-display-sm font-semibold tracking-tight text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className={cn("flex shrink-0 gap-2", isMobile && "w-full [&>*]:flex-1")}>
          {actions}
        </div>
      )}
    </div>
  );
}
