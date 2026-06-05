import { getGreeting } from "./useDashboardPage";

interface DashboardHeroProps {
  firstName: string;
  dashboardDate: string;
  roleLabel: string;
  isFetching: boolean;
  hasData: boolean;
  compact?: boolean;
}

export function DashboardHero({
  firstName,
  dashboardDate,
  roleLabel,
  isFetching,
  hasData,
  compact,
}: DashboardHeroProps) {
  return (
    <section
      className={`brand-gradient relative overflow-hidden rounded-2xl border border-white/10 text-white shadow-brand-md ${
        compact ? "p-4" : "p-5 sm:p-7 lg:p-8"
      }`}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-white/70">{dashboardDate}</p>
          <div className="flex items-center gap-2">
            {roleLabel && (
              <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-medium capitalize text-white/90">
                {roleLabel}
              </span>
            )}
            <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80">
              {isFetching && !hasData ? "Syncing..." : "Live"}
            </span>
          </div>
        </div>
        <h2 className={`mt-1 font-semibold tracking-tight text-balance ${compact ? "text-xl" : "text-2xl sm:text-3xl"}`}>
          {getGreeting()}, {firstName}
        </h2>
        <p className={`mt-2 max-w-lg text-white/75 ${compact ? "text-xs" : "text-sm sm:text-[0.95rem]"}`}>
          Here&apos;s what&apos;s happening at Ace Digital today.
        </p>
      </div>
    </section>
  );
}
