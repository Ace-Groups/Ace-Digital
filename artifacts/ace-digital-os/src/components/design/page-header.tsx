import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  eyebrow?: string;
}

export function PageHeader({ title, description, actions, className, eyebrow }: PageHeaderProps) {
  const isMobile = useIsMobile();
  const reduced = useReducedMotion();

  const content = (
    <div
      className={cn(
        "flex gap-4",
        isMobile ? "flex-col items-stretch" : "flex-row items-end justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        {eyebrow && (
          <p className="v2-stat-label">{eyebrow}</p>
        )}
        <h2 className="text-display-md font-semibold tracking-tight text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className={cn("flex shrink-0 gap-2", isMobile && "w-full [&>*]:flex-1")}>
          {actions}
        </div>
      )}
    </div>
  );

  if (reduced) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {content}
    </motion.div>
  );
}
