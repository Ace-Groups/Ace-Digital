import type { ReactNode } from "react";
import { PageTransition, StaggerList } from "@/components/design";
import { cn } from "@/lib/utils";

interface V2PageCanvasProps {
  children: ReactNode;
  className?: string;
  stagger?: boolean;
}

/** Unified v2 page wrapper — consistent spacing, motion, max-width. */
export function V2PageCanvas({ children, className, stagger = false }: V2PageCanvasProps) {
  const content = (
    <div className={cn("v2-page dash-canvas-root", className)}>
      {children}
    </div>
  );

  if (stagger) {
    return (
      <PageTransition>
        <StaggerList>{content}</StaggerList>
      </PageTransition>
    );
  }

  return <PageTransition>{content}</PageTransition>;
}
