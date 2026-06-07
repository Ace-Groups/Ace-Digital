import { Zap, Activity, Cpu, Clock } from "lucide-react";
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
      "w-full rounded-2xl border border-white/5 bg-[#0a0a0b]/60 shadow-2xl relative overflow-hidden backdrop-blur-xl",
      compact ? "p-4 sm:p-5" : "p-6 md:p-8"
    )}>
      {/* Subtle background neon glow */}
      <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-[#00ffcc]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-[200px] h-[200px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Greeting and Actions */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] tracking-widest font-mono text-[#9CA3AF] uppercase">
              {dashboardDate}
            </span>
            {roleLabel && (
              <>
                <span className="text-white/20 text-xs font-mono">//</span>
                <span className="rounded-full border border-[#00FFCC]/20 bg-[#00FFCC]/5 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-[#00FFCC]">
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
              "font-display font-medium text-[#E5E7EB] mt-1",
              compact ? "text-lg" : "text-xl md:text-2xl"
            )}>
              {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
            </h2>
            {!compact && (
              <p className="text-sm text-[#9CA3AF] font-sans mt-2 max-w-md leading-relaxed">
                Your workspace is running at peak capacity. Initialize session to view live telemetry and coordinate client deliverables.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1">
            <button
              type="button"
              className="px-5 py-2.5 bg-[#00FFCC] hover:bg-[#00e6b8] text-[#0A0A0B] font-bold font-sans rounded-lg tracking-wider text-[11px] uppercase transition-all duration-300 shadow-[0_0_15px_rgba(0,255,204,0.2)] hover:shadow-[0_0_25px_rgba(0,255,204,0.5)] cursor-pointer flex items-center gap-2"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              Initialize Core
            </button>
            <span className="text-[10px] font-mono text-[#9CA3AF]/70 uppercase tracking-wider hidden sm:inline-block">
              {isFetching && !hasData ? "Syncing Workspace..." : "System Nominal"}
            </span>
          </div>
        </div>

        {/* Right Column: Glassmorphism Stats Panel */}
        <div className="lg:col-span-5 w-full">
          <div className="tech-glass-neon p-5 rounded-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase font-sans tracking-widest flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#00FFCC]" />
                Active Nodes
              </span>
              <span className="text-sm font-semibold text-[#E5E7EB] font-sans">
                1,842 <span className="text-[9px] text-[#00FFCC] font-mono animate-pulse ml-1">● LIVE</span>
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase font-sans tracking-widest flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#00FFCC]" />
                Quantum Load
              </span>
              <span className="text-sm font-semibold text-[#E5E7EB] font-sans">
                34.8%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase font-sans tracking-widest flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#00FFCC]" />
                Response Rate
              </span>
              <span className="text-sm font-semibold text-[#E5E7EB] font-sans">
                12ms
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
