import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { StaggerItem, StaggerList } from "@/components/design";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import {
  useListTasks, useCreateTask, useToggleTask, useListProjects, useListEmployees, useListTeams, useUpdateTask,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Calendar, Filter, Layers3, CheckCircle2, Users2, Sparkles, UserPlus2 } from "lucide-react";
import { priorityColor, statusColor, cn, formatRelativeTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/use-permissions";
import { getInitials } from "@/lib/utils";

const createSchema = z.object({
  title: z.string().min(1, "Title required"),
  projectId: z.string().optional(),
  assigneeId: z.string().optional(),
  teamId: z.string().optional(),
  priority: z.string(),
  dueDate: z.string().optional(),
  status: z.string(),
});
type CreateForm = z.infer<typeof createSchema>;

const STATUSES = ["PENDING", "IN_PROGRESS", "DONE"];
const OWNERSHIP_FILTERS = ["all", "mine", "common"] as const;
const COMMON_TASK_VALUE = "__common__";
const ALL_TEAMS_VALUE = "__all_teams__";

function getProjectIdFromUrl(): number | undefined {
  const id = new URLSearchParams(window.location.search).get("projectId");
  if (!id) return undefined;
  const n = Number(id);
  return Number.isFinite(n) ? n : undefined;
}

export default function TasksPage() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { can } = usePermissions();
  const canWriteTasks = can("tasks:write");
  const projectIdFilter = getProjectIdFromUrl();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [ownershipFilter, setOwnershipFilter] = useState<(typeof OWNERSHIP_FILTERS)[number]>("all");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);

  const taskParams = useMemo(() => {
    const base: { status?: string; projectId?: number } = {};
    if (filterStatus !== "all") base.status = filterStatus;
    if (projectIdFilter) base.projectId = projectIdFilter;
    return base;
  }, [filterStatus, projectIdFilter]);

  const { data: projects } = useListProjects();
  const filteredProject = projects?.find((p) => p.id === projectIdFilter);
  const { data: tasks, isLoading } = useListTasks(taskParams);
  const { data: employees } = useListEmployees({});
  const { data: teams } = useListTeams();
  const toggleTask = useToggleTask();
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      title: "",
      priority: "MEDIUM",
      status: "PENDING",
      projectId: projectIdFilter ? String(projectIdFilter) : "",
      teamId: ALL_TEAMS_VALUE,
    },
  });

  useEffect(() => {
    if (projectIdFilter) {
      form.setValue("projectId", String(projectIdFilter));
    }
  }, [projectIdFilter, form]);

  const selectedTeamId = form.watch("teamId");

  const assignableEmployees = useMemo(() => {
    const list = employees ?? [];
    if (!selectedTeamId || selectedTeamId === ALL_TEAMS_VALUE) return list;
    const teamId = Number(selectedTeamId);
    if (!Number.isFinite(teamId)) return list;
    return list.filter((e) => e.teamId === teamId);
  }, [employees, selectedTeamId]);

  useEffect(() => {
    const allowed = new Set(assignableEmployees.map((e) => e.id));
    setSelectedAssigneeIds((prev) => prev.filter((id) => allowed.has(id)));
  }, [assignableEmployees]);

  async function onSubmit(data: CreateForm) {
    const teamId = data.teamId && data.teamId !== ALL_TEAMS_VALUE ? Number(data.teamId) : undefined;
    const assigneeIds = selectedAssigneeIds;

    if (assigneeIds.length === 0) {
      await createTask.mutateAsync({
        data: {
          title: data.title,
          projectId: data.projectId ? Number(data.projectId) : undefined,
          assigneeId: undefined,
          teamId,
          priority: data.priority,
          dueDate: data.dueDate || undefined,
          status: data.status,
        },
      });
    } else {
      for (const assigneeId of assigneeIds) {
        await createTask.mutateAsync({
          data: {
            title: data.title,
            projectId: data.projectId ? Number(data.projectId) : undefined,
            assigneeId,
            teamId,
            priority: data.priority,
            dueDate: data.dueDate || undefined,
            status: data.status,
          },
        });
      }
    }

    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    toast({
      title: assigneeIds.length > 1 ? "Tasks created!" : "Task created!",
      description:
        assigneeIds.length > 1
          ? `${assigneeIds.length} tasks were assigned successfully.`
          : assigneeIds.length === 1
            ? "Task assigned successfully."
            : "Common task created without assignee.",
    });
    setOpen(false);
    form.reset();
    setSelectedAssigneeIds([]);
  }

  async function handleToggle(id: number) {
    await toggleTask.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
  }

  async function handleAssignTask(taskId: number, assigneeIdValue: string) {
    if (!canWriteTasks) return;
    await updateTask.mutateAsync({
      id: taskId,
      data: {
        assigneeId: assigneeIdValue === COMMON_TASK_VALUE ? null : Number(assigneeIdValue),
      } as never,
    });
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    toast({ title: "Task assignment updated" });
  }

  const visibleTasks = useMemo(() => {
    const source = tasks ?? [];
    if (!user) return source;
    if (ownershipFilter === "mine") return source.filter((t) => t.assigneeId === user.id);
    if (ownershipFilter === "common") return source.filter((t) => t.assigneeId == null);
    return source;
  }, [tasks, ownershipFilter, user]);

  const stats = useMemo(() => {
    const source = visibleTasks;
    const done = source.filter((t) => t.status === "DONE").length;
    const mine = user ? source.filter((t) => t.assigneeId === user.id).length : 0;
    const common = source.filter((t) => t.assigneeId == null).length;
    return { total: source.length, done, mine, common };
  }, [visibleTasks, user]);

  const createForm = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel>Task Title</FormLabel>
            <FormControl><Input data-testid="input-task-title" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="teamId" render={({ field }) => (
            <FormItem>
              <FormLabel>Team</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Team" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value={ALL_TEAMS_VALUE}>All teams</SelectItem>
                  {teams?.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FormLabel className="text-sm">Assignees</FormLabel>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => {
                  if (selectedAssigneeIds.length === assignableEmployees.length) {
                    setSelectedAssigneeIds([]);
                  } else {
                    setSelectedAssigneeIds(assignableEmployees.map((e) => e.id));
                  }
                }}
              >
                {selectedAssigneeIds.length === assignableEmployees.length && assignableEmployees.length > 0
                  ? "Clear all"
                  : "Select all"}
              </button>
            </div>
            <div className="max-h-36 space-y-2 overflow-y-auto rounded-lg border border-border/70 p-2">
              {assignableEmployees.length === 0 ? (
                <p className="text-xs text-muted-foreground">No users available for selected team.</p>
              ) : (
                assignableEmployees.map((e) => (
                  <label key={e.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50">
                    <Checkbox
                      checked={selectedAssigneeIds.includes(e.id)}
                      onCheckedChange={(checked) => {
                        setSelectedAssigneeIds((prev) =>
                          checked ? [...prev, e.id] : prev.filter((id) => id !== e.id),
                        );
                      }}
                    />
                    <span className="text-sm">{e.fullName}</span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to create a common task. Select multiple users to assign one task to each.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="priority" render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="dueDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date</FormLabel>
              <FormControl><Input type="date" data-testid="input-task-due" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>
        <Button data-testid="btn-submit-task" type="submit" className="h-11 w-full sm:h-10" disabled={createTask.isPending}>
          Create Task
        </Button>
      </form>
    </Form>
  );

  return (
    <AppLayout title="Tasks">
      <StaggerList className="page-stack">
      <StaggerItem>
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-primary/30 via-primary/10 to-background p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-10 -top-8 h-28 w-28 rounded-full bg-primary/20 blur-2xl" />
          <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                <Sparkles size={12} />
                Task Control Center
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                Personal, common, and team tasks in one flow
              </h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Assign tasks to teammates or keep them common. Filters instantly reflect work ownership by account.
              </p>
            </div>
            <Button
              data-testid="btn-create-task"
              className="hidden gap-2 sm:inline-flex"
              onClick={() => setOpen(true)}
            >
              <Plus size={16} /> New Task
            </Button>
          </div>
        </section>
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-card/80 p-3 shadow-brand-sm">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Layers3 size={13} /> Visible Tasks</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/80 p-3 shadow-brand-sm">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CheckCircle2 size={13} /> Done</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{stats.done}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/80 p-3 shadow-brand-sm">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><UserPlus2 size={13} /> Assigned to me</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{stats.mine}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/80 p-3 shadow-brand-sm">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users2 size={13} /> Common</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{stats.common}</p>
          </div>
        </div>
      </StaggerItem>

      <StaggerItem>
      {projectIdFilter && filteredProject && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border bg-primary/5 px-4 py-2.5 text-sm">
          <span>
            Showing tasks for <strong>{filteredProject.name}</strong>
          </span>
          <Link href="/tasks">
            <button type="button" className="text-primary text-xs font-medium hover:underline">
              Clear filter
            </button>
          </Link>
        </div>
      )}
      </StaggerItem>
      <StaggerItem>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter size={14} className="shrink-0 text-muted-foreground" />
          <div className="flex gap-1">
            {["all", ...STATUSES].map((s) => (
              <button
                key={s}
                type="button"
                data-testid={`filter-${s.toLowerCase()}`}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "min-h-9 shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  filterStatus === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {s === "all" ? "All" : s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {OWNERSHIP_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              data-testid={`ownership-${s}`}
              onClick={() => setOwnershipFilter(s)}
              className={cn(
                "min-h-9 shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                ownershipFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {s === "all" ? "All tasks" : s === "mine" ? "Assigned to me" : "Common"}
            </button>
          ))}
        </div>
        <ResponsiveSheet open={open} onOpenChange={setOpen} title="Create Task">
          {createForm}
        </ResponsiveSheet>
      </div>
      </StaggerItem>

      <StaggerItem>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : visibleTasks.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No tasks found for this filter.</p>
              <Button className="mt-4 gap-2" onClick={() => setOpen(true)}>
                <Plus size={14} /> Create Task
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {visibleTasks.map((task) => (
                <div
                  key={task.id}
                  data-testid={`task-row-${task.id}`}
                  className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4"
                >
                  <Checkbox
                    data-testid={`task-toggle-${task.id}`}
                    checked={task.status === "DONE"}
                    onCheckedChange={() => handleToggle(task.id)}
                    className="border-border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", task.status === "DONE" && "line-through text-muted-foreground")}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.projectName && (
                        <span className="text-xs text-muted-foreground">{task.projectName}</span>
                      )}
                      {task.teamName && (
                        <span className="text-xs text-muted-foreground">• {task.teamName}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
                    {canWriteTasks && (
                      <Select
                        value={task.assigneeId == null ? COMMON_TASK_VALUE : String(task.assigneeId)}
                        onValueChange={(value) => void handleAssignTask(task.id, value)}
                      >
                        <SelectTrigger className="h-8 w-[9.5rem] text-xs">
                          <SelectValue placeholder="Assign" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={COMMON_TASK_VALUE}>Common task</SelectItem>
                          {employees?.map((e) => (
                            <SelectItem key={e.id} value={String(e.id)}>
                              {e.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {task.assigneeName && (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-primary/15 text-primary">
                            {getInitials(task.assigneeName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground hidden sm:block">{task.assigneeName}</span>
                      </div>
                    )}
                    {task.dueDate && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(task.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    )}
                    <Badge variant="outline" className={cn("text-xs", priorityColor(task.priority))}>
                      {task.priority}
                    </Badge>
                    <Badge variant="outline" className={cn("text-xs", statusColor(task.status))}>
                      {task.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </StaggerItem>

      {isMobile && (
      <StaggerItem>
        <Button
          data-testid="btn-create-task-fab"
          size="lg"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 h-14 w-14 rounded-full p-0 shadow-brand-md sm:hidden"
          onClick={() => setOpen(true)}
          aria-label="New task"
        >
          <Plus size={22} />
        </Button>
      </StaggerItem>
      )}
      </StaggerList>
    </AppLayout>
  );
}
