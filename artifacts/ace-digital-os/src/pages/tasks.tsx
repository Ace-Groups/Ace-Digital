import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { StaggerItem, StaggerList } from "@/components/design";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useListTasks,
  useCreateTask,
  useToggleTask,
  useListProjects,
  useListEmployees,
  useListTeams,
  useUpdateTask,
  useDeleteTask,
  getListTasksQueryKey,
  type Task,
} from "@workspace/api-client-react";
import { canDeleteTask, canEditTask, canToggleTaskCompletion } from "@workspace/rbac";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Calendar, Filter, Layers3, CheckCircle2, Users2, UserPlus2, Pencil, Trash2 } from "lucide-react";
import { priorityColor, statusColor, cn, formatRelativeTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AssigneeMultiSelect } from "@/components/tasks/AssigneeMultiSelect";
import { TaskAssigneesDisplay } from "@/components/tasks/TaskAssigneesDisplay";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/use-permissions";
import {
  patchListItem,
  prependListItem,
  removeListItem,
  replaceListItem,
  setList,
  snapshotList,
} from "@/lib/optimistic";
import { runOptimistic } from "@/lib/optimistic/run-optimistic";

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

const editSchema = z.object({
  title: z.string().min(1, "Title required"),
  projectId: z.string(),
  priority: z.string(),
  dueDate: z.string().optional(),
  status: z.string(),
});
type EditForm = z.infer<typeof editSchema>;

const STATUSES = ["PENDING", "IN_PROGRESS", "DONE"];
const OWNERSHIP_FILTERS = ["all", "mine", "common"] as const;
const ALL_TEAMS_VALUE = "__all_teams__";
const NO_PROJECT_VALUE = "__no_project__";

const PROJECT_STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
};

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
  const [editSelectedAssigneeIds, setEditSelectedAssigneeIds] = useState<number[]>([]);

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
  const deleteTask = useDeleteTask();
  const createTask = useCreateTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      title: "",
      priority: "MEDIUM",
      status: "PENDING",
      projectId: projectIdFilter ? String(projectIdFilter) : NO_PROJECT_VALUE,
      teamId: ALL_TEAMS_VALUE,
    },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: "",
      projectId: NO_PROJECT_VALUE,
      priority: "MEDIUM",
      status: "PENDING",
      dueDate: "",
    },
  });

  const accessCtx = useMemo(
    () =>
      user
        ? { userId: user.id, role: user.role, teamId: user.teamId ?? null }
        : null,
    [user],
  );

  function canManageTask(task: Task) {
    if (!accessCtx) return false;
    return canEditTask(accessCtx, {
      createdById: task.createdById ?? null,
      assigneeId: task.assigneeId ?? null,
      teamId: task.teamId ?? null,
    });
  }

  function canCompleteTask(task: Task) {
    if (!accessCtx) return false;
    return canToggleTaskCompletion(accessCtx, {
      createdById: task.createdById ?? null,
      assigneeId: task.assigneeId ?? null,
      assigneeIds: task.assigneeIds,
    });
  }

  function canRemoveTask(task: Task) {
    if (!accessCtx) return false;
    return canDeleteTask(accessCtx, {
      createdById: task.createdById ?? null,
      assigneeId: task.assigneeId ?? null,
      teamId: task.teamId ?? null,
    });
  }

  function isMyPartDone(task: Task) {
    if (!user) return task.status === "DONE";
    const mine = task.assignees?.find((a) => a.userId === user.id);
    if (mine) return mine.completed;
    if ((task.assignees?.length ?? 0) === 0) return task.status === "DONE";
    return false;
  }

  const activeProjects = useMemo(() => {
    const active = (projects ?? []).filter((p) => p.status !== "DONE");
    const current = projectIdFilter ? projects?.find((p) => p.id === projectIdFilter) : undefined;
    const merged =
      current && !active.some((p) => p.id === current.id) ? [current, ...active] : active;
    return merged.sort((a, b) => a.name.localeCompare(b.name));
  }, [projects, projectIdFilter]);

  useEffect(() => {
    if (projectIdFilter) {
      form.setValue("projectId", String(projectIdFilter));
    }
  }, [projectIdFilter, form]);

  const selectedTeamId = form.watch("teamId");
  const selectedProjectId = form.watch("projectId");

  useEffect(() => {
    if (!selectedProjectId || selectedProjectId === NO_PROJECT_VALUE) return;
    const project = projects?.find((p) => p.id === Number(selectedProjectId));
    if (project?.teamId) {
      form.setValue("teamId", String(project.teamId));
    }
  }, [selectedProjectId, projects, form]);

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

  function resolveProjectId(value: string | undefined) {
    return value && value !== NO_PROJECT_VALUE ? Number(value) : undefined;
  }

  function resetCreateForm() {
    form.reset({
      title: "",
      priority: "MEDIUM",
      status: "PENDING",
      projectId: projectIdFilter ? String(projectIdFilter) : NO_PROJECT_VALUE,
      teamId: ALL_TEAMS_VALUE,
      dueDate: "",
    });
    setSelectedAssigneeIds([]);
  }

  async function onSubmit(data: CreateForm) {
    const teamId = data.teamId && data.teamId !== ALL_TEAMS_VALUE ? Number(data.teamId) : undefined;
    const assigneeIds = selectedAssigneeIds;
    const projectId = resolveProjectId(data.projectId);
    const queryKey = getListTasksQueryKey(taskParams);
    const tempId = -Date.now();
    const optimistic: Task = {
      id: tempId,
      title: data.title,
      projectId: projectId ?? null,
      assigneeIds: assigneeIds.length ? assigneeIds : undefined,
      assignees: assigneeIds.map((uid) => ({
        userId: uid,
        fullName: employees?.find((e) => e.id === uid)?.fullName ?? "Assignee",
        completed: false,
      })),
      teamId: teamId ?? null,
      priority: data.priority,
      dueDate: data.dueDate || null,
      status: data.status,
      progress: 0,
      createdById: user?.id ?? null,
      createdByName: user?.fullName ?? null,
      createdAt: new Date().toISOString(),
    };
    setOpen(false);
    resetCreateForm();
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<Task>(queryClient, queryKey);
          prependListItem(queryClient, queryKey, optimistic);
          return prev;
        },
        rollback: (prev) => setList(queryClient, queryKey, prev),
        commit: () =>
          createTask.mutateAsync({
            data: {
              title: data.title,
              projectId,
              assigneeIds: assigneeIds.length ? assigneeIds : undefined,
              teamId,
              priority: data.priority,
              dueDate: data.dueDate || undefined,
              status: data.status,
            },
          }),
        reconcile: (created) => replaceListItem(queryClient, queryKey, tempId, created),
      });
      toast({
        title: "Task created",
        description:
          assigneeIds.length > 1
            ? `One shared task for ${assigneeIds.length} people.`
            : assigneeIds.length === 1
              ? "Task assigned."
              : "Common task created.",
      });
    } catch {
      toast({ title: "Couldn't create task", variant: "destructive" });
    }
  }

  async function handleToggle(task: Task, checked: boolean) {
    if (!canCompleteTask(task)) {
      toast({ title: "Only assignees can mark their part done", variant: "destructive" });
      return;
    }
    const queryKey = getListTasksQueryKey(taskParams);
    const previous = queryClient.getQueryData<Task[]>(queryKey);
    queryClient.setQueryData<Task[]>(queryKey, (old) =>
      old?.map((t) => {
        if (t.id !== task.id || !user) return t;
        const assignees = (t.assignees ?? []).map((a) =>
          a.userId === user.id ? { ...a, completed: checked } : a,
        );
        const done = assignees.filter((a) => a.completed).length;
        const total = assignees.length || 1;
        const progress = assignees.length ? Math.round((done / total) * 100) : checked ? 100 : 0;
        return {
          ...t,
          assignees,
          progress,
          status: progress >= 100 ? "DONE" : progress > 0 ? "IN_PROGRESS" : "PENDING",
        };
      }),
    );
    try {
      await toggleTask.mutateAsync({ id: task.id });
      await queryClient.invalidateQueries({ queryKey });
    } catch {
      queryClient.setQueryData(queryKey, previous);
      toast({ title: "Couldn't update task", variant: "destructive" });
    }
  }

  function requestDeleteTask(task: Task) {
    if (!canRemoveTask(task)) return;
    setTaskToDelete(task);
  }

  async function confirmDeleteTask() {
    if (!taskToDelete) return;
    const id = taskToDelete.id;
    const queryKey = getListTasksQueryKey(taskParams);
    setTaskToDelete(null);
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<Task>(queryClient, queryKey);
          removeListItem(queryClient, queryKey, id);
          return prev;
        },
        rollback: (prev) => setList(queryClient, queryKey, prev),
        commit: () => deleteTask.mutateAsync({ id }),
      });
      toast({ title: "Task deleted" });
    } catch {
      toast({ title: "Couldn't delete task", variant: "destructive" });
    }
  }

  function openEditTask(task: Task) {
    setEditingTask(task);
    setEditSelectedAssigneeIds(
      task.assigneeIds?.length
        ? [...task.assigneeIds]
        : task.assigneeId != null
          ? [task.assigneeId]
          : [],
    );
    editForm.reset({
      title: task.title,
      projectId: task.projectId ? String(task.projectId) : NO_PROJECT_VALUE,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      status: task.status,
    });
    setEditOpen(true);
  }

  async function onEditSubmit(data: EditForm) {
    if (!editingTask) return;
    const assigneeIds = editSelectedAssigneeIds;
    const queryKey = getListTasksQueryKey(taskParams);
    const taskId = editingTask.id;
    setEditOpen(false);
    setEditingTask(null);
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<Task>(queryClient, queryKey);
          patchListItem(queryClient, queryKey, taskId, (t) => ({
            ...t,
            title: data.title,
            projectId: resolveProjectId(data.projectId),
            assigneeIds,
            priority: data.priority,
            dueDate: data.dueDate || null,
            status: data.status,
          }));
          return prev;
        },
        rollback: (prev) => setList(queryClient, queryKey, prev),
        commit: () =>
          updateTask.mutateAsync({
            id: taskId,
            data: {
              title: data.title,
              projectId: resolveProjectId(data.projectId),
              assigneeIds,
              priority: data.priority,
              dueDate: data.dueDate || undefined,
              status: data.status,
            },
          }),
        reconcile: (updated) => patchListItem(queryClient, queryKey, taskId, () => updated),
      });
      toast({ title: "Task updated" });
    } catch {
      toast({ title: "Couldn't save task", variant: "destructive" });
    }
  }

  async function handleProjectTask(task: Task, projectIdValue: string) {
    if (!canManageTask(task)) return;
    const queryKey = getListTasksQueryKey(taskParams);
    const projectId = projectIdValue === NO_PROJECT_VALUE ? null : Number(projectIdValue);
    try {
      await runOptimistic({
        apply: () => {
          const prev = snapshotList<Task>(queryClient, queryKey);
          patchListItem(queryClient, queryKey, task.id, (t) => ({ ...t, projectId }));
          return prev;
        },
        rollback: (prev) => setList(queryClient, queryKey, prev),
        commit: () =>
          updateTask.mutateAsync({
            id: task.id,
            data: { projectId } as never,
          }),
        reconcile: (updated) => patchListItem(queryClient, queryKey, task.id, () => updated),
      });
      toast({ title: "Task project updated" });
    } catch {
      toast({ title: "Couldn't update task", variant: "destructive" });
    }
  }

  const visibleTasks = useMemo(() => {
    const source = tasks ?? [];
    if (!user) return source;
    if (ownershipFilter === "mine") {
      return source.filter((t) => t.assigneeIds?.includes(user.id) || t.assigneeId === user.id);
    }
    if (ownershipFilter === "common") {
      return source.filter((t) => (t.assigneeIds?.length ?? 0) === 0 && t.assigneeId == null);
    }
    return source;
  }, [tasks, ownershipFilter, user]);

  const stats = useMemo(() => {
    const source = visibleTasks;
    const done = source.filter((t) => t.status === "DONE").length;
    const mine = user
      ? source.filter((t) => t.assigneeIds?.includes(user.id) || t.assigneeId === user.id).length
      : 0;
    const common = source.filter(
      (t) => (t.assigneeIds?.length ?? 0) === 0 && t.assigneeId == null,
    ).length;
    return { total: source.length, done, mine, common };
  }, [visibleTasks, user]);

  const createForm = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mobile-form space-y-4 sm:space-y-4">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel>Task Title</FormLabel>
            <FormControl><Input data-testid="input-task-title" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="projectId" render={({ field }) => (
          <FormItem>
            <FormLabel>Project</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value && field.value.length > 0 ? field.value : NO_PROJECT_VALUE}
            >
              <FormControl>
                <SelectTrigger data-testid="select-task-project">
                  <SelectValue placeholder="Select active project" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value={NO_PROJECT_VALUE}>No project</SelectItem>
                {activeProjects.length === 0 ? (
                  <SelectItem value="__empty__" disabled>
                    No active projects
                  </SelectItem>
                ) : (
                  activeProjects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                      {p.teamName ? ` · ${p.teamName}` : ""}
                      {` (${PROJECT_STATUS_LABELS[p.status] ?? p.status})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Link the task to an active project (To Do, In Progress, or Review). Completed projects are hidden.
            </p>
          </FormItem>
        )} />
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
        <AssigneeMultiSelect
          employees={assignableEmployees}
          selectedIds={selectedAssigneeIds}
          onChange={setSelectedAssigneeIds}
          emptyLabel="No users available for selected team."
        />
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
              <FormControl>
                <DatePicker
                  inModal
                  data-testid="input-task-due"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Select due date"
                />
              </FormControl>
            </FormItem>
          )} />
        </div>
        <Button data-testid="btn-submit-task" type="submit" className="h-12 w-full text-base sm:h-10 sm:text-sm" disabled={createTask.isPending}>
          Create Task
        </Button>
      </form>
    </Form>
  );

  const editFormContent = (
    <Form {...editForm}>
      <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="mobile-form space-y-4">
        <FormField control={editForm.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl><Input data-testid="input-edit-task-title" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={editForm.control} name="projectId" render={({ field }) => (
          <FormItem>
            <FormLabel>Project</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Project" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value={NO_PROJECT_VALUE}>No project</SelectItem>
                {activeProjects.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )} />
        <AssigneeMultiSelect
          employees={employees ?? []}
          selectedIds={editSelectedAssigneeIds}
          onChange={setEditSelectedAssigneeIds}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField control={editForm.control} name="priority" render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={editForm.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>
        <FormField control={editForm.control} name="dueDate" render={({ field }) => (
          <FormItem>
            <FormLabel>Due date</FormLabel>
            <FormControl>
              <DatePicker
                inModal
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="Select due date"
              />
            </FormControl>
          </FormItem>
        )} />
        <Button type="submit" className="h-12 w-full sm:h-10" disabled={updateTask.isPending}>
          Save changes
        </Button>
      </form>
    </Form>
  );

  return (
    <AppLayout title="Tasks">
      <StaggerList className="page-stack">
      <StaggerItem>
        <div className={cn("grid gap-3", isMobile ? "mobile-stat-scroll" : "grid-cols-2 sm:grid-cols-4")}>
          <div className={cn("rounded-xl border border-border/70 bg-card/80 p-3 shadow-brand-sm", isMobile && "min-w-[10.5rem]")}>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Layers3 size={13} /> Visible Tasks</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{stats.total}</p>
          </div>
          <div className={cn("rounded-xl border border-border/70 bg-card/80 p-3 shadow-brand-sm", isMobile && "min-w-[10.5rem]")}>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CheckCircle2 size={13} /> Done</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{stats.done}</p>
          </div>
          <div className={cn("rounded-xl border border-border/70 bg-card/80 p-3 shadow-brand-sm", isMobile && "min-w-[10.5rem]")}>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><UserPlus2 size={13} /> Assigned to me</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{stats.mine}</p>
          </div>
          <div className={cn("rounded-xl border border-border/70 bg-card/80 p-3 shadow-brand-sm", isMobile && "min-w-[10.5rem]")}>
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
        <div className="flex flex-wrap items-center gap-2">
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
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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
        <Button
          data-testid="btn-create-task"
          className="hidden shrink-0 gap-2 sm:inline-flex"
          onClick={() => setOpen(true)}
        >
          <Plus size={16} /> New Task
        </Button>
        <ResponsiveSheet open={open} onOpenChange={setOpen} title="Create Task">
          {createForm}
        </ResponsiveSheet>
        <ResponsiveSheet
          open={editOpen}
          onOpenChange={(v) => {
            setEditOpen(v);
            if (!v) setEditingTask(null);
          }}
          title="Edit Task"
        >
          {editFormContent}
        </ResponsiveSheet>
        </div>
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
                    checked={isMyPartDone(task)}
                    disabled={!canCompleteTask(task) || toggleTask.isPending}
                    onCheckedChange={(checked) => {
                      if (checked === "indeterminate") return;
                      void handleToggle(task, checked === true);
                    }}
                    className="size-5 shrink-0 border-border sm:size-4"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", task.progress >= 100 && "line-through text-muted-foreground")}>
                      {task.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      {task.projectName && (
                        <span className="text-xs text-muted-foreground">{task.projectName}</span>
                      )}
                      {task.teamName && (
                        <span className="text-xs text-muted-foreground">• {task.teamName}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
                    <Badge variant="outline" className="text-xs tabular-nums">
                      {task.progress}%
                    </Badge>
                    {canManageTask(task) && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0 sm:h-8 sm:w-8"
                          data-testid={`task-edit-${task.id}`}
                          onClick={() => openEditTask(task)}
                          aria-label="Edit task"
                        >
                          <Pencil size={16} />
                        </Button>
                        {canRemoveTask(task) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 shrink-0 text-destructive sm:h-8 sm:w-8"
                            data-testid={`task-delete-${task.id}`}
                            onClick={() => requestDeleteTask(task)}
                            aria-label="Delete task"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                        <Select
                          value={task.projectId == null ? NO_PROJECT_VALUE : String(task.projectId)}
                          onValueChange={(value) => void handleProjectTask(task, value)}
                        >
                          <SelectTrigger className="h-10 w-full min-w-[9.5rem] text-xs sm:h-8 sm:w-[10.5rem]" data-testid={`task-project-${task.id}`}>
                            <SelectValue placeholder="Project" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_PROJECT_VALUE}>No project</SelectItem>
                            {activeProjects.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.name}
                              </SelectItem>
                            ))}
                            {task.projectId != null &&
                              !activeProjects.some((p) => p.id === task.projectId) && (
                                <SelectItem value={String(task.projectId)}>
                                  {task.projectName ?? `Project #${task.projectId}`}
                                </SelectItem>
                              )}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                    <TaskAssigneesDisplay assignees={task.assignees} />
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

      <ConfirmDialog
        open={taskToDelete !== null}
        onOpenChange={(open) => !open && setTaskToDelete(null)}
        title="Delete task?"
        description={
          taskToDelete ? (
            <>
              This permanently removes <strong>{taskToDelete.title}</strong>. This cannot be undone.
            </>
          ) : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        loading={deleteTask.isPending}
        onConfirm={confirmDeleteTask}
      />
    </AppLayout>
  );
}
