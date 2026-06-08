import { useMemo } from "react";
import { Employee, Project, Task } from "@workspace/api-client-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Target, CheckCircle2, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface TeamOverviewTabProps {
  teamId: number;
  members: Employee[];
  projects: Project[];
  tasks: Task[]; // Note: tasks might need to be fetched in the parent component
}

export function TeamOverviewTab({ teamId, members, projects, tasks }: TeamOverviewTabProps) {
  // Chart 1: Project statuses
  const projectStats = useMemo(() => {
    const counts = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0, CANCELLED: 0 };
    projects.forEach((p) => {
      if (p.status in counts) counts[p.status as keyof typeof counts]++;
    });
    return [
      { name: "To Do", value: counts.TODO, color: "#94a3b8" },
      { name: "In Progress", value: counts.IN_PROGRESS, color: "#3b82f6" },
      { name: "Review", value: counts.REVIEW, color: "#f59e0b" },
      { name: "Done", value: counts.DONE, color: "#10b981" },
    ].filter(d => d.value > 0);
  }, [projects]);

  // Chart 2: Task workload by member
  const workloadStats = useMemo(() => {
    const counts: Record<number, number> = {};
    tasks.forEach(t => {
      if (t.status === "DONE" || t.status === "CANCELLED") return;
      if (t.assigneeId) counts[t.assigneeId] = (counts[t.assigneeId] || 0) + 1;
    });
    
    return members
      .map(m => ({
        name: m.fullName.split(" ")[0], // First name only for chart
        value: counts[m.id] || 0,
        color: m.role === "team_lead" ? "#0ea5e9" : "#64748b"
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [tasks, members]);

  // Upcoming deadlines
  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    return projects
      .filter(p => p.status !== "DONE" && p.status !== "CANCELLED" && p.deadline)
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
      .slice(0, 5)
      .map(p => ({
        ...p,
        daysLeft: differenceInDays(new Date(p.deadline!), now)
      }));
  }, [projects]);

  return (
    <ScrollArea className="h-full -mx-4 px-4 pb-6">
      <div className="flex flex-col gap-4">
        {/* Top metrics row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-sm border-primary/10 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {projects.filter(p => p.status !== "DONE" && p.status !== "CANCELLED").length}
                </h3>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-emerald-500/10 bg-emerald-500/5">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <h3 className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {projects.filter(p => p.status === "DONE").length}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-blue-500/10 bg-blue-500/5">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Open Tasks</p>
                <h3 className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                  {tasks.filter(t => t.status !== "DONE" && t.status !== "CANCELLED").length}
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="shadow-sm min-h-[300px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Project Status</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px]">
              {projectStats.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No projects to display
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {projectStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => [value, "Projects"]}
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm min-h-[300px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Open Tasks by Member</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px]">
              {workloadStats.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No open tasks assigned
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={workloadStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {workloadStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => [value, "Tasks"]}
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}
