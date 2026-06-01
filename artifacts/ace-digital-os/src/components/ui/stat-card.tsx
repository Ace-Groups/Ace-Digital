import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type StatTone = "brand" | "success" | "warning" | "danger";

const toneStyles: Record<
  StatTone,
  { icon: string; surface: string }
> = {
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
    <Card
      data-testid={testId}
      className={cn(
        "border-border/80 shadow-sm transition-all duration-200",
        href && "cursor-pointer hover:border-primary/25 hover:shadow-md hover:-translate-y-0.5"
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-24 mt-2" />
            ) : (
              <p className="text-2xl font-semibold tracking-tight text-foreground mt-1 tabular-nums">
                {value}
              </p>
            )}
          </div>
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              styles.surface
            )}
          >
            <Icon size={20} className={styles.icon} aria-hidden />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
