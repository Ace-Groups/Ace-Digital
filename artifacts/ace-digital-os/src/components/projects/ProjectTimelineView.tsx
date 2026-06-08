import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar, IndianRupee, Clock, ArrowRight, FilterX } from "lucide-react";
import { formatCurrency, priorityColor, cn } from "@/lib/utils";
import type { Project } from "@workspace/api-client-react";

interface ProjectTimelineViewProps {
  projects: Project[];
  teams?: { id: number; name: string; color?: string | null | undefined }[];
  onSelectProject: (project: Project) => void;
}

type ScaleMode = "month" | "quarter";

export function ProjectTimelineView({
  projects,
  teams = [],
  onSelectProject,
}: ProjectTimelineViewProps) {
  const [scaleMode, setScaleMode] = useState<ScaleMode>("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedTeams, setSelectedTeams] = useState<Set<number>>(() => new Set());
  const [hoveredProjectId, setHoveredProjectId] = useState<number | null>(null);

  // Team mapping for quick color and name retrieval
  const teamMap = useMemo(() => {
    return new Map(teams.map((t) => [t.id, t]));
  }, [teams]);

  // Handle Team Filtering
  const toggleTeamFilter = (teamId: number) => {
    setSelectedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const clearTeamFilters = () => setSelectedTeams(new Set());

  // Filter projects based on selected teams
  const filteredProjects = useMemo(() => {
    if (selectedTeams.size === 0) return projects;
    return projects.filter((p) => p.teamId && selectedTeams.has(p.teamId));
  }, [projects, selectedTeams]);

  // Date boundaries for Month or Quarter View
  const dateRange = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (scaleMode === "month") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    } else {
      // Quarter Calculation
      const quarter = Math.floor(start.getMonth() / 3);
      start.setMonth(quarter * 3);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      end.setMonth(quarter * 3 + 3);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  }, [currentDate, scaleMode]);

  // Calculate day labels or week labels for columns
  const timelineColumns = useMemo(() => {
    const cols: { date: Date; label: string; subLabel: string }[] = [];
    const temp = new Date(dateRange.start);

    if (scaleMode === "month") {
      while (temp <= dateRange.end) {
        cols.push({
          date: new Date(temp),
          label: temp.getDate().toString(),
          subLabel: temp.toLocaleDateString("en-US", { weekday: "narrow" }),
        });
        temp.setDate(temp.getDate() + 1);
      }
    } else {
      // Weekly intervals for the quarter
      while (temp <= dateRange.end) {
        cols.push({
          date: new Date(temp),
          label: `W${cols.length + 1}`,
          subLabel: temp.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        });
        temp.setDate(temp.getDate() + 7);
      }
    }
    return cols;
  }, [dateRange, scaleMode]);

  // Pagination navigation
  const shiftPeriod = (direction: number) => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (scaleMode === "month") {
        next.setMonth(next.getMonth() + direction);
      } else {
        next.setMonth(next.getMonth() + direction * 3);
      }
      return next;
    });
  };

  const periodHeaderLabel = useMemo(() => {
    if (scaleMode === "month") {
      return dateRange.start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } else {
      const startMonth = dateRange.start.toLocaleDateString("en-US", { month: "short" });
      const endMonth = dateRange.end.toLocaleDateString("en-US", { month: "short" });
      const year = dateRange.start.getFullYear();
      const quarterNumber = Math.floor(dateRange.start.getMonth() / 3) + 1;
      return `Q${quarterNumber} (${startMonth} – ${endMonth} ${year})`;
    }
  }, [dateRange, scaleMode]);

  // Helper to project start/end dates onto the timeline grid as percentage left & width
  const calculateBarPosition = (proj: Project) => {
    const projCreated = proj.createdAt ? new Date(proj.createdAt) : new Date();
    // Default deadline to 30 days after creation if missing
    const projDeadline = proj.deadline ? new Date(proj.deadline) : new Date(projCreated.getTime() + 30 * 24 * 60 * 60 * 1000);

    const timelineStart = dateRange.start.getTime();
    const timelineEnd = dateRange.end.getTime();
    const timelineDuration = timelineEnd - timelineStart;

    // Bound dates within the current view range
    const barStart = Math.max(projCreated.getTime(), timelineStart);
    const barEnd = Math.min(projDeadline.getTime(), timelineEnd);

    // If project is completely outside the current view bounds
    if (projDeadline.getTime() < timelineStart || projCreated.getTime() > timelineEnd) {
      return null;
    }

    const leftPercent = ((barStart - timelineStart) / timelineDuration) * 100;
    const widthPercent = ((barEnd - barStart) / timelineDuration) * 100;

    // Minimum visible width of 3% so it doesn't disappear
    return {
      left: `${leftPercent}%`,
      width: `${Math.max(widthPercent, 3)}%`,
      isStartCut: projCreated.getTime() < timelineStart,
      isEndCut: projDeadline.getTime() > timelineEnd,
      actualStart: projCreated,
      actualEnd: projDeadline,
    };
  };

  // Compute Today line offset
  const todayPosition = useMemo(() => {
    const now = new Date();
    const start = dateRange.start.getTime();
    const end = dateRange.end.getTime();
    if (now.getTime() < start || now.getTime() > end) return null;
    return `${((now.getTime() - start) / (end - start)) * 100}%`;
  }, [dateRange]);

  return (
    <div className="space-y-4">
      {/* Timeline Controls and Scale Switches */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftPeriod(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200 active:scale-95"
            aria-label="Previous period"
          >
            <ChevronLeft size={16} />
          </button>
          <h3 className="min-w-[12rem] text-center font-display text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {periodHeaderLabel}
          </h3>
          <button
            type="button"
            onClick={() => shiftPeriod(1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200 active:scale-95"
            aria-label="Next period"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => setCurrentDate(new Date())}
            className="ml-2 rounded-lg border border-border/80 px-2.5 py-1 text-xs font-semibold hover:bg-muted/50 transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Scale Selector */}
          <div className="flex rounded-xl border border-border bg-muted/20 p-1">
            <button
              type="button"
              onClick={() => setScaleMode("month")}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
                scaleMode === "month"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Month View
            </button>
            <button
              type="button"
              onClick={() => setScaleMode("quarter")}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
                scaleMode === "quarter"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Quarter View
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Team Filter Legend */}
      {teams.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/50 bg-card/25 p-3 backdrop-blur-xl">
          <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
            Filters:
          </span>
          {teams.map((t) => {
            const active = selectedTeams.has(t.id);
            return (
              <button
                key={t.id}
                onClick={() => toggleTeamFilter(t.id)}
                style={{
                  borderColor: active && t.color ? t.color : "transparent",
                  backgroundColor: active && t.color ? `${t.color}15` : undefined,
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-1 text-xs font-medium transition-all duration-200 cursor-pointer active:scale-95",
                  active
                    ? "text-foreground shadow-sm"
                    : "border-border/60 hover:border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  style={{ backgroundColor: t.color || undefined }}
                  className="h-2 w-2 rounded-full ring-2 ring-white/10"
                />
                {t.name}
              </button>
            );
          })}
          {selectedTeams.size > 0 && (
            <button
              onClick={clearTeamFilters}
              className="flex items-center gap-1.5 rounded-xl border border-dashed border-destructive/30 px-3 py-1 text-xs font-semibold text-destructive/80 hover:bg-destructive/10 transition-colors"
            >
              <FilterX size={12} /> Clear Filter
            </button>
          )}
        </div>
      )}

      {/* Main Timeline Board container */}
      <div className="relative rounded-2xl border border-border/60 bg-card/30 dark:bg-black/20 shadow-2xl overflow-hidden backdrop-blur-xl">
        <div className="min-w-[760px] overflow-x-auto">
          {/* Timeline Grid Header */}
          <div className="flex border-b border-border/40">
            {/* Left Header Corner */}
            <div className="sticky left-0 z-20 w-[240px] shrink-0 border-r border-border/40 bg-card/90 dark:bg-[#0a0a0b]/90 backdrop-blur-md px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Projects / Teams
              </span>
            </div>

            {/* Grid Columns Titles */}
            <div className="relative flex flex-1">
              {timelineColumns.map((col, idx) => (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center justify-center py-2 px-1 text-center min-w-[32px] border-r border-border/10 last:border-r-0"
                >
                  <span className="text-[10px] font-bold text-muted-foreground/50 uppercase leading-none">
                    {col.subLabel}
                  </span>
                  <span className="mt-1 text-xs font-semibold text-foreground leading-none">
                    {col.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Scrollable Grid Rows */}
          <div className="relative divide-y divide-border/20">
            {/* Running Today Indicator line */}
            {todayPosition && (
              <div
                style={{ left: `calc(240px + ${todayPosition})` }}
                className="absolute top-0 bottom-0 z-10 w-[2px] bg-red-500/80 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.7)]"
                title="Today"
              >
                <div className="absolute -top-1.5 -left-1 h-3.5 w-3.5 rounded-full bg-red-500 ring-4 ring-red-500/20" />
              </div>
            )}

            {filteredProjects.length === 0 ? (
              <div className="py-20 text-center">
                <Calendar className="mx-auto text-muted-foreground/45 mb-2" size={36} />
                <p className="text-sm text-muted-foreground">No active projects found in this range.</p>
              </div>
            ) : (
              filteredProjects.map((project) => {
                const team = project.teamId ? teamMap.get(project.teamId) : null;
                const pos = calculateBarPosition(project);
                const isProjectVisible = pos !== null;

                return (
                  <div key={project.id} className="group flex items-center min-h-[58px] hover:bg-muted/15 transition-colors">
                    {/* Sticky left panel for Project Titles */}
                    <div
                      onClick={() => onSelectProject(project)}
                      className="sticky left-0 z-20 w-[240px] shrink-0 border-r border-border/40 bg-card/90 dark:bg-[#0a0a0b]/90 backdrop-blur-md px-4 py-2 flex flex-col justify-center cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                      <h4 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {project.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {team && team.color ? (
                          <span
                            style={{ backgroundColor: team.color || undefined }}
                            className="h-1.5 w-1.5 rounded-full"
                          />
                        ) : null}
                        <span className="text-[10px] text-muted-foreground capitalize font-medium">
                          {team?.name ?? "No team"}
                        </span>
                        {project.clientName && (
                          <>
                            <span className="text-muted-foreground/35 text-[9px]">•</span>
                            <span className="text-[10px] text-muted-foreground/85 truncate max-w-[100px]">
                              {project.clientName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Timeline row cells */}
                    <div className="relative flex-1 h-full min-h-[58px] flex items-center">
                      {/* Grid background divider lines */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {timelineColumns.map((_, idx) => (
                          <div key={idx} className="flex-1 border-r border-border/10 last:border-r-0 h-full" />
                        ))}
                      </div>

                      {/* Render Gantt bar */}
                      {isProjectVisible && (
                        <div
                          style={{ left: pos.left, width: pos.width }}
                          className="absolute px-1 z-10"
                        >
                          <div
                            onMouseEnter={() => setHoveredProjectId(project.id)}
                            onMouseLeave={() => setHoveredProjectId(null)}
                            onClick={() => onSelectProject(project)}
                            style={{
                              borderColor: team && team.color ? `${team.color}45` : undefined,
                              boxShadow: hoveredProjectId === project.id && team && team.color
                                ? `0 0 16px ${team.color}20`
                                : undefined,
                            }}
                            className={cn(
                              "relative h-7 rounded-lg glass-panel flex items-center px-2.5 overflow-hidden cursor-pointer select-none border animate-hover-card",
                              pos.isStartCut && "rounded-l-none border-l-dashed border-l-primary/30",
                              pos.isEndCut && "rounded-r-none border-r-dashed border-r-primary/30"
                            )}
                          >
                            {/* Inner sliding progress track */}
                            <div
                              style={{
                                width: `${project.progress}%`,
                                backgroundColor: team && team.color ? `${team.color}15` : "var(--color-primary-border)",
                              }}
                              className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-500 ease-out"
                            />

                            {/* Leading gradient bar */}
                            <div
                              style={{
                                width: `${project.progress}%`,
                                background: team && team.color
                                  ? `linear-gradient(90deg, transparent, ${team.color}40)`
                                  : undefined,
                              }}
                              className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-500 ease-out"
                            />

                            <span className="relative z-10 text-[10px] font-semibold text-foreground truncate pr-6">
                              {project.progress}%
                            </span>

                            {/* Little badge showing priority */}
                            <div className="absolute right-2 top-1.5">
                              <span
                                className={cn(
                                  "text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border",
                                  priorityColor(project.priority)
                                )}
                              >
                                {project.priority}
                              </span>
                            </div>
                          </div>

                          {/* Beautiful Interactive Tooltip on Hover */}
                          <AnimatePresence>
                            {hoveredProjectId === project.id && (
                              <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                animate={{ opacity: 1, y: -4, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute bottom-full left-1/2 -translate-x-1/2 z-30 mb-2 w-72 rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-md p-4 shadow-2xl text-xs space-y-3 pointer-events-none"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span
                                      className={cn(
                                        "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border",
                                        priorityColor(project.priority)
                                      )}
                                    >
                                      {project.priority} Priority
                                    </span>
                                    <span className="text-[10px] text-muted-foreground capitalize">
                                      {project.status.replace("_", " ")}
                                    </span>
                                  </div>
                                  <h5 className="font-semibold text-foreground text-sm leading-tight">
                                    {project.name}
                                  </h5>
                                  {project.description && (
                                    <p className="text-muted-foreground leading-normal line-clamp-2 mt-1">
                                      {project.description}
                                    </p>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-border/40">
                                  <div>
                                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground/80 font-medium">
                                      Schedule
                                    </span>
                                    <p className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                                      <Calendar size={11} className="text-muted-foreground" />
                                      {pos.actualStart.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                      <ArrowRight size={10} className="text-muted-foreground" />
                                      {pos.actualEnd.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                    </p>
                                  </div>
                                  {project.budget != null && (
                                    <div>
                                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/80 font-medium">
                                        Budget
                                      </span>
                                      <p className="font-semibold text-foreground flex items-center gap-0.5 mt-0.5">
                                        <IndianRupee size={11} className="text-muted-foreground" />
                                        {formatCurrency(project.budget)}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px]">
                                  <div className="flex items-center gap-1.5">
                                    {team && team.color && (
                                      <span
                                        style={{ backgroundColor: team.color || undefined }}
                                        className="h-2 w-2 rounded-full"
                                      />
                                    )}
                                    <span className="font-medium text-muted-foreground">{team?.name ?? "No Team"}</span>
                                  </div>
                                  <span className="font-bold text-primary">{project.progress}% Done</span>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
