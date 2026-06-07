import { Activity, Cpu, Clock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardHeroCardProps {
  firstName: string;
  dashboardDate: string;
  roleLabel: string;
  isFetching: boolean;
  hasData: boolean;
  compact?: boolean;
}

export function DashboardHeroCard({
  firstName,
  dashboardDate,
  roleLabel,
  isFetching,
  hasData,
  compact,
}: DashboardHeroCardProps) {
  return (
    <div className={cn(
      "w-full rounded-2xl border border-border dark:border-white/5 bg-card/60 dark:bg-[#0a0a0b]/60 shadow-sm dark:shadow-2xl relative overflow-hidden backdrop-blur-xl text-foreground",
      compact ? "p-4 sm:p-5" : "p-6 md:p-8"
    )}>
      {/* Subtle background neon glows */}
      <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-primary/5 dark:bg-[#00ffcc]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-[180px] h-[180px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Greeting and Status */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] tracking-widest font-mono text-muted-foreground uppercase">
              {dashboardDate}
            </span>
            {roleLabel && (
              <>
                <span className="text-muted-foreground/30 text-xs font-mono">//</span>
                <span className="rounded-full border border-primary/20 dark:border-[#00FFCC]/20 bg-primary/5 dark:bg-[#00FFCC]/5 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-primary dark:text-[#00FFCC]">
                  {roleLabel.replace("_", " ")}
                </span>
              </>
            )}
          </div>
          
          <div>
            <h1 className={cn(
              "neon-border-text font-bold tracking-wider select-none leading-none",
              compact ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl md:text-6xl"
            )}>
              WELCOME
            </h1>
            <h2 className={cn(
              "font-display font-medium text-foreground mt-1.5",
              compact ? "text-lg" : "text-xl md:text-2xl"
            )}>
              {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
            </h2>
            {!compact && (
              <p className="text-sm text-muted-foreground font-sans mt-2 max-w-md leading-relaxed">
                All systems are fully synchronized. Your digital workspace is secured and running at nominal performance.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Refined HUD telemetry (simplified) */}
        <div className="lg:col-span-5 w-full">
          <div className="border border-border dark:border-white/5 bg-muted/40 dark:bg-[#0a0a0b]/40 backdrop-blur-md p-5 rounded-xl flex flex-col gap-4 shadow-sm dark:shadow-[0_0_15px_rgba(0,255,204,0.05)]">
            {/* System Status */}
            <div className="flex items-center justify-between border-b border-border/50 dark:border-white/5 pb-2.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase font-sans tracking-widest flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-primary dark:text-[#00FFCC]" />
                System Status
              </span>
              <span className="text-xs font-semibold text-primary dark:text-[#00FFCC] font-mono uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary dark:bg-[#00FFCC] animate-pulse" />
                Operational
              </span>
            </div>

            {/* CPU Load */}
            <div className="flex items-center justify-between border-b border-border/50 dark:border-white/5 pb-2.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase font-sans tracking-widest flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-primary dark:text-[#00FFCC]" />
                System Load
              </span>
              <div className="flex items-center gap-3">
                <div className="w-16 h-1 bg-muted dark:bg-white/5 rounded-full overflow-hidden border border-border/50 dark:border-white/5 hidden sm:block">
                  <div className="h-full bg-primary dark:bg-[#00FFCC] rounded-full shadow-[0_0_8px_hsl(var(--primary))] dark:shadow-[0_0_8px_#00FFCC]" style={{ width: "34.8%" }} />
                </div>
                <span className="text-xs font-semibold text-foreground dark:text-[#E5E7EB] font-mono">
                  34.8%
                </span>
              </div>
            </div>

            {/* Network Latency */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase font-sans tracking-widest flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary dark:text-[#00FFCC]" />
                API Latency
              </span>
              <span className="text-xs font-semibold text-foreground dark:text-[#E5E7EB] font-mono">
                12ms
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
