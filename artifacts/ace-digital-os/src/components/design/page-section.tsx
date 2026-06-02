import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageSection({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <section className={cn("space-y-3 sm:space-y-4", className)}>
      {title && (
        <h3 className="text-label font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}
