import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { SurfaceCard } from "@/components/design";
import { cn } from "@/lib/utils";

type StatTone = "brand" | "success" | "warning" | "danger";

const toneStyles: Record<StatTone, { icon: string; surface: string }> = {
  brand: {
    icon: "text-primary",
    surface: "bg-primary/10",
  },
  success: {
    icon: "text-emerald-600 dark:text-emerald-400",
    surface: "bg-emerald-500/10",
  },
  warning: {
    icon: "text-amber-600 dark:text-amber-400",
    surface: "bg-amber-500/10",
  },
  danger: {
    icon: "text-red-600 dark:text-red-400",
    surface: "bg-red-500/10",
  },
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  href?: string;
  tone?: StatTone;
  isLoading?: boolean;
  testId?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  href,
  tone = "brand",
  isLoading,
  testId,
}: StatCardProps) {
  const styles = toneStyles[tone];
  const content = (
    <SurfaceCard
      data-testid={testId}
      className={cn(
        "p-5 transition-transform duration-200",
        href && "cursor-pointer active:scale-[0.98] md:hover:border-primary/25 md:hover:shadow-brand-sm",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label text-muted-foreground">{label}</p>
          {isLoading ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : (
            <p className="text-display-sm mt-1 tabular-nums text-foreground">{value}</p>
          )}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            styles.surface,
          )}
        >
          <Icon size={20} className={styles.icon} aria-hidden />
        </div>
      </div>
    </SurfaceCard>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
