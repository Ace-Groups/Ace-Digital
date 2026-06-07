import { Activity, Cpu, Clock, Zap } from "lucide-react";

export function DashboardHeroCard() {
  return (
    <div className="w-full rounded-2xl border border-white/5 bg-[#0a0a0b]/80 p-6 md:p-8 shadow-2xl relative overflow-hidden">
      {/* Background neon grid/glow effect for futuristic vibe */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#00ffcc]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-[250px] h-[250px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-6 md:gap-8">
        <div>
          <h1 className="neon-border-text text-5xl sm:text-6xl md:text-7xl font-bold tracking-wider select-none leading-none">
            WELCOME
          </h1>
          <p className="mt-2 text-sm text-[#9CA3AF] font-sans tracking-wide uppercase">
            Ace Digital OS // Cybernetic Control Center
          </p>
        </div>

        {/* Glassmorphism Statistics Panel */}
        <div className="tech-glass p-5 md:p-6 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-6 relative overflow-hidden">
          <div className="flex flex-col gap-1.5 border-b sm:border-b-0 sm:border-r border-white/5 pb-4 sm:pb-0 sm:pr-4">
            <span className="text-xs font-semibold text-[#9CA3AF] uppercase font-sans tracking-widest flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#00FFCC]" />
              Active Nodes
            </span>
            <span className="text-3xl font-bold text-[#E5E7EB] font-sans tracking-tight">
              1,842 <span className="text-xs text-[#00FFCC] font-normal animate-pulse">● LIVE</span>
            </span>
          </div>

          <div className="flex flex-col gap-1.5 border-b sm:border-b-0 sm:border-r border-white/5 pb-4 sm:pb-0 sm:pr-4">
            <span className="text-xs font-semibold text-[#9CA3AF] uppercase font-sans tracking-widest flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-[#00FFCC]" />
              Quantum Load
            </span>
            <span className="text-3xl font-bold text-[#E5E7EB] font-sans tracking-tight">
              34.8%
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[#9CA3AF] uppercase font-sans tracking-widest flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#00FFCC]" />
              Response Rate
            </span>
            <span className="text-3xl font-bold text-[#E5E7EB] font-sans tracking-tight">
              12ms
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            className="px-6 py-3 bg-[#00FFCC] hover:bg-[#00e6b8] text-[#0A0A0B] font-bold font-sans rounded-lg tracking-wider text-xs uppercase transition-all duration-300 shadow-[0_0_15px_rgba(0,255,204,0.3)] hover:shadow-[0_0_25px_rgba(0,255,204,0.6)] cursor-pointer flex items-center gap-2"
          >
            <Zap className="w-4 h-4 fill-current" />
            Initialize Core
          </button>
          
          <span className="text-xs text-[#9CA3AF] font-mono tracking-wider uppercase hidden sm:inline-block">
            System status: nominal // port 8080 secure
          </span>
        </div>
      </div>
    </div>
  );
}
