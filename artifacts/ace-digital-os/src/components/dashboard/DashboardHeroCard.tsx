import { useEffect, useState } from "react";
import { CheckSquare, Layers, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardHeroCardProps {
  firstName: string;
  dashboardDate: string;
  roleLabel: string;
  isFetching: boolean;
  hasData: boolean;
  compact?: boolean;
  dash?: any;
}

export function DashboardHeroCard({
  firstName,
  dashboardDate,
  roleLabel,
  isFetching,
  hasData,
  compact,
  dash,
}: DashboardHeroCardProps) {
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 30000); // Update every 30 seconds
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const greeting = getGreeting();

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-border/80 dark:border-white/5 bg-card/45 dark:bg-[#0a0a0b]/45 shadow-sm dark:shadow-2xl relative overflow-hidden backdrop-blur-xl text-foreground",
        compact ? "p-4 sm:p-5" : "p-6 md:p-8"
      )}
    >
      {/* Soft background radial gradient (subtle, elegant) */}
      <div className="absolute top-0 right-0 w-[180px] h-[180px] bg-primary/5 dark:bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left: Greeting & Current Date/Time */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground/80">
            <span>{dashboardDate}</span>
            {timeStr && (
              <>
                <span className="text-muted-foreground/30">•</span>
                <span className="font-mono text-[11px] tracking-wide text-primary dark:text-primary-foreground">{timeStr}</span>
              </>
            )}
            {roleLabel && (
              <>
                <span className="text-muted-foreground/30">•</span>
                <span className="capitalize text-[11px] bg-primary/5 dark:bg-primary/10 px-2 py-0.5 rounded-full border border-primary/10">
                  {roleLabel.replace(/_/g, " ")}
                </span>
              </>
            )}
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              {greeting}, {firstName}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-sans">
              Here is a quick snapshot of your workspace today.
            </p>
          </div>
        </div>

        {/* Right: Clean, Elegant Info Badges */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Open Tasks */}
          <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 dark:bg-white/[0.02] border border-border/40 dark:border-white/5 px-4 py-2.5 shadow-sm">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <CheckSquare size={16} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Open Tasks</p>
              <p className="text-sm font-bold text-foreground mt-0.5">{dash?.myOpenTasksCount ?? 0}</p>
            </div>
          </div>

          {/* Active Projects */}
          <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 dark:bg-white/[0.02] border border-border/40 dark:border-white/5 px-4 py-2.5 shadow-sm">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Layers size={16} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Projects</p>
              <p className="text-sm font-bold text-foreground mt-0.5">{dash?.activeProjectsCount ?? 0}</p>
            </div>
          </div>

          {/* Pending Approvals */}
          {(roleLabel !== "employee" || (dash?.pendingApprovalsCount ?? 0) > 0) && (
            <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 dark:bg-white/[0.02] border border-border/40 dark:border-white/5 px-4 py-2.5 shadow-sm">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                <FileCheck size={16} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Approvals</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{dash?.pendingApprovalsCount ?? 0}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
